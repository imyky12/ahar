import cron from "node-cron";
import type { ScheduledTask } from "node-cron";
import { addDays } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

import { ActivityLogModel } from "../models/ActivityLog";
import { DietPlanModel, type IDietPlan } from "../models/DietPlan";
import { NotificationModel } from "../models/Notification";
import { UserProfileModel } from "../models/UserProfile";
import { UserNotificationSettingsModel } from "../models/UserNotificationSettings";
import { logger } from "../utils/logger";
import { generateDietPlan } from "./aiService";
import {
  buildDailyNotifications,
  scheduleGroceryReadyNotification,
  sendPlanReadyNotification,
  sendPushNotification,
} from "./notificationService";
import { pregenerateQuotesForDate } from "./quoteService";
import { runWeeklySummaryCron } from "./weeklyCheckinService";

let planSchedulerStarted = false;
let senderSchedulerStarted = false;
let weeklySchedulerStarted = false;
let quoteSchedulerStarted = false;
let planTask: ScheduledTask | null = null;
let senderTask: ScheduledTask | null = null;
let weeklyTask: ScheduledTask | null = null;
let quoteTask: ScheduledTask | null = null;

export const triggerManualPlanGeneration = async (
  userId: string,
): Promise<IDietPlan> => {
  const profile = await UserProfileModel.findOne({
    userId,
    isDeleted: { $ne: true },
  }).lean();
  if (!profile) {
    throw new Error("PROFILE_NOT_FOUND");
  }

  const tomorrowDate = formatInTimeZone(
    addDays(new Date(), 1),
    profile.location.timezone,
    "yyyy-MM-dd",
  );
  const plan = await generateDietPlan(userId, tomorrowDate);

  const updated = await DietPlanModel.findOneAndUpdate(
    { userId, date: tomorrowDate, isDeleted: false },
    { $set: { isManuallyTriggered: true } },
    { new: true },
  );

  if (!updated) {
    throw new Error("PLAN_GENERATION_FAILED");
  }

  return updated.toObject();
};

export const startPlanScheduler = (): void => {
  if (planSchedulerStarted) {
    return;
  }

  planSchedulerStarted = true;

  planTask = cron.schedule("* * * * *", async () => {
    const now = new Date();

    try {
      const profiles = await UserProfileModel.find(
        { isDeleted: { $ne: true }, isOnboardingComplete: true },
        { userId: 1, location: 1 },
      ).lean();

      const profilesAtNine = profiles.filter((profile) => {
        const hour = Number(
          formatInTimeZone(now, profile.location.timezone, "H"),
        );
        const minute = Number(
          formatInTimeZone(now, profile.location.timezone, "m"),
        );
        return hour === 21 && minute === 0;
      });

      for (const profile of profilesAtNine) {
        try {
          const tomorrowDate = formatInTimeZone(
            addDays(now, 1),
            profile.location.timezone,
            "yyyy-MM-dd",
          );

          const lock = await DietPlanModel.findOneAndUpdate(
            {
              userId: profile.userId,
              date: tomorrowDate,
              isDeleted: false,
            },
            {
              $setOnInsert: {
                userId: profile.userId,
                date: tomorrowDate,
                status: "generating",
                isDeleted: false,
              },
            },
            { upsert: true, new: false },
          ).lean();

          if (lock) {
            continue;
          }

          const plan = await generateDietPlan(profile.userId, tomorrowDate);

          const fullProfile = await UserProfileModel.findOne({
            userId: profile.userId,
            isDeleted: { $ne: true },
          }).lean();

          if (!fullProfile) {
            continue;
          }

          await buildDailyNotifications(
            profile.userId,
            plan,
            fullProfile,
            tomorrowDate,
          );

          await sendPlanReadyNotification(profile.userId);
          await scheduleGroceryReadyNotification(
            profile.userId,
            tomorrowDate,
            plan.groceryList.length,
          );

          await ActivityLogModel.create({
            userId: profile.userId,
            action: "plan_generated",
            metadata: {
              date: tomorrowDate,
              tokensUsed: plan.aiPromptTokens,
              planType: plan.planType,
            },
            timestamp: new Date(),
          });
        } catch (error) {
          logger.error(
            `Nightly plan generation failed for user=${profile.userId}: ${String(error)}`,
          );
        }
      }
    } catch (error) {
      logger.error(`Scheduler tick failed: ${String(error)}`);
    }
  });

  logger.info("Nightly plan scheduler started");
};

export const startNotificationSender = (): void => {
  if (senderSchedulerStarted) {
    return;
  }

  senderSchedulerStarted = true;

  senderTask = cron.schedule("* * * * *", async () => {
    try {
      const dueNotifications = await NotificationModel.find({
        isSent: false,
        isDeleted: false,
        scheduledFor: { $lte: new Date() },
      })
        .sort({ scheduledFor: 1 })
        .limit(100)
        .lean();

      let sentCount = 0;

      for (const notification of dueNotifications) {
        try {
          const settings = await UserNotificationSettingsModel.findOne({
            userId: notification.userId,
          }).lean();

          if (settings?.expoPushToken && settings.notificationsEnabled) {
            const ticketId = await sendPushNotification({
              userId: notification.userId,
              expoPushToken: settings.expoPushToken,
              title: notification.title,
              body: notification.body,
              data:
                notification.data && typeof notification.data === "object"
                  ? (notification.data as Record<string, unknown>)
                  : {},
              sound: notification.sound,
              priority:
                notification.priority === "low"
                  ? "default"
                  : notification.priority,
            });

            await NotificationModel.updateOne(
              { _id: notification._id },
              {
                $set: {
                  isSent: true,
                  sentAt: new Date(),
                  expoNotificationId: ticketId ?? undefined,
                },
              },
            );

            await ActivityLogModel.create({
              userId: notification.userId,
              action: "notification_push_attempt",
              metadata: {
                source: "scheduled_sender",
                type: notification.type,
                notificationId: String(notification._id),
                pushTokenPresent: true,
                success: Boolean(ticketId),
                ticketId: ticketId ?? undefined,
              },
              timestamp: new Date(),
            });
          } else {
            await NotificationModel.updateOne(
              { _id: notification._id },
              {
                $set: {
                  isSent: true,
                  sentAt: new Date(),
                },
              },
            );

            await ActivityLogModel.create({
              userId: notification.userId,
              action: "notification_push_attempt",
              metadata: {
                source: "scheduled_sender",
                type: notification.type,
                notificationId: String(notification._id),
                pushTokenPresent: Boolean(settings?.expoPushToken),
                success: false,
                reason: settings?.notificationsEnabled
                  ? "NO_EXPO_PUSH_TOKEN"
                  : "NOTIFICATIONS_DISABLED",
              },
              timestamp: new Date(),
            });
          }

          sentCount += 1;
        } catch (error) {
          logger.error(
            `Notification send failure id=${String(notification._id)} user=${notification.userId}: ${String(error)}`,
          );
        }
      }

      if (sentCount > 0) {
        logger.info(`Sent ${sentCount} notifications`);
      }
    } catch (error) {
      logger.error(`Notification sender cron failed: ${String(error)}`);
    }
  });

  logger.info("Notification sender scheduler started");
};

export const startWeeklySummaryScheduler = (): void => {
  if (weeklySchedulerStarted) {
    return;
  }

  weeklySchedulerStarted = true;

  weeklyTask = cron.schedule("* * * * *", async () => {
    try {
      await runWeeklySummaryCron();
    } catch (error) {
      logger.error(`Weekly summary scheduler tick failed: ${String(error)}`);
    }
  });

  logger.info("Weekly summary scheduler started");
};

export const scheduleWeeklySummaries = (): void => {
  startWeeklySummaryScheduler();
};

export const startQuoteScheduler = (): void => {
  if (quoteSchedulerStarted) return;
  quoteSchedulerStarted = true;

  // Run every day at 06:00 UTC — warm before any user's wakeTime + 10min notification
  quoteTask = cron.schedule("0 6 * * *", async () => {
    try {
      const todayUtc = formatInTimeZone(new Date(), "UTC", "yyyy-MM-dd");
      await pregenerateQuotesForDate(todayUtc);
    } catch (error) {
      logger.error(`Quote pre-generation cron failed: ${String(error)}`);
    }
  });

  logger.info("Daily quote scheduler started (runs 06:00 UTC)");
};

export const stopAll = (): void => {
  planTask?.stop();
  senderTask?.stop();
  weeklyTask?.stop();
  quoteTask?.stop();

  planTask?.destroy();
  senderTask?.destroy();
  weeklyTask?.destroy();
  quoteTask?.destroy();

  planTask = null;
  senderTask = null;
  weeklyTask = null;
  quoteTask = null;

  planSchedulerStarted = false;
  senderSchedulerStarted = false;
  weeklySchedulerStarted = false;
  quoteSchedulerStarted = false;
};
