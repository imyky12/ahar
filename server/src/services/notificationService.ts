import axios from "axios";
import { addMinutes, format, subDays, subMinutes } from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

import { getQuoteForNotification } from "./quoteService";

import { ActivityLogModel } from "../models/ActivityLog";
import type { IDietPlan } from "../models/DietPlan";
import { NotificationModel, type INotification } from "../models/Notification";
import type { IUserProfile } from "../models/UserProfile";
import { UserProfileModel } from "../models/UserProfile";
import {
  UserNotificationSettingsModel,
  type IUserNotificationSettings,
} from "../models/UserNotificationSettings";
import { logger } from "../utils/logger";

const EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send";

const DEFAULT_ENABLED_TYPES: IUserNotificationSettings["enabledTypes"] = {
  plan_ready: true,
  prep_task: true,
  meal_checkin: true,
  water_reminder: true,
  walk_reminder: true,
  skin_care: true,
  supplement: true,
  gym_log: true,
  sleep_checkin: true,
  macro_alert: true,
  weekly_checkin: true,
  energy_checkin: true,
  grocery_ready: true,
  streak_milestone: true,
  daily_quote: true,
  medicine_reminder: true,
};

type ScheduleParams = {
  userId: string;
  type: INotification["type"];
  title: string;
  body: string;
  scheduledFor: Date;
  data?: Record<string, unknown>;
  sound?: INotification["sound"];
  priority?: INotification["priority"];
};

export type ImmediateNotificationParams = Omit<ScheduleParams, "scheduledFor">;

const logPushAttempt = async (params: {
  userId: string;
  source: string;
  type: INotification["type"];
  success: boolean;
  pushTokenPresent: boolean;
  ticketId?: string | null;
  reason?: string;
}): Promise<void> => {
  try {
    await ActivityLogModel.create({
      userId: params.userId,
      action: "notification_push_attempt",
      metadata: {
        source: params.source,
        type: params.type,
        success: params.success,
        pushTokenPresent: params.pushTokenPresent,
        ticketId: params.ticketId ?? undefined,
        reason: params.reason ?? undefined,
      },
      timestamp: new Date(),
    });
  } catch {
    // non-blocking
  }
};

const getSettingsOrDefaults = async (
  userId: string,
): Promise<IUserNotificationSettings> => {
  const settings = await UserNotificationSettingsModel.findOne({
    userId,
  }).lean();

  if (settings) {
    return settings;
  }

  return {
    userId,
    notificationsEnabled: true,
    quietHoursStart: "23:00",
    quietHoursEnd: "07:00",
    enabledTypes: DEFAULT_ENABLED_TYPES,
    waterReminderIntervalMinutes: 90,
    quotePreference: "motivational",
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

const parseHHMM = (value: string): { hour: number; minute: number } => {
  const [hourRaw, minuteRaw] = value.split(":");
  return {
    hour: Number(hourRaw),
    minute: Number(minuteRaw),
  };
};

const minutesSinceMidnight = (date: Date): number => {
  return date.getHours() * 60 + date.getMinutes();
};

const isWithinQuietHours = (
  localDate: Date,
  quietStart: string,
  quietEnd: string,
): boolean => {
  const start = parseHHMM(quietStart);
  const end = parseHHMM(quietEnd);
  const current = minutesSinceMidnight(localDate);
  const startMinutes = start.hour * 60 + start.minute;
  const endMinutes = end.hour * 60 + end.minute;

  if (startMinutes < endMinutes) {
    return current >= startMinutes && current < endMinutes;
  }

  return current >= startMinutes || current < endMinutes;
};

const rescheduleToQuietEnd = (
  scheduledForUtc: Date,
  timezone: string,
  quietEnd: string,
): Date => {
  const local = toZonedTime(scheduledForUtc, timezone);
  const end = parseHHMM(quietEnd);
  const localDate = format(local, "yyyy-MM-dd");

  let candidate = fromZonedTime(
    `${localDate}T${end.hour.toString().padStart(2, "0")}:${end.minute
      .toString()
      .padStart(2, "0")}:00`,
    timezone,
  );

  if (candidate.getTime() <= scheduledForUtc.getTime()) {
    const nextLocalDate = format(addMinutes(local, 24 * 60), "yyyy-MM-dd");
    candidate = fromZonedTime(
      `${nextLocalDate}T${end.hour.toString().padStart(2, "0")}:${end.minute
        .toString()
        .padStart(2, "0")}:00`,
      timezone,
    );
  }

  return candidate;
};

const chooseRandom = <T>(values: T[]): T => {
  return values[Math.floor(Math.random() * values.length)] as T;
};

const localDateTimeToUtc = (
  date: string,
  time: string,
  timezone: string,
): Date => {
  return fromZonedTime(`${date}T${time}:00`, timezone);
};

const asMeal = (plan: IDietPlan, match: (label: string) => boolean) => {
  return plan.meals.find((meal) => match(meal.label.toLowerCase()));
};

const soundToChannelId = (sound?: string): string => {
  switch (sound) {
    case "chime":
      return "ahar-chime";
    case "alert":
      return "ahar-alert";
    case "gentle":
      return "ahar-gentle";
    default:
      return "ahar-default";
  }
};

export const sendPushNotification = async (params: {
  userId: string;
  expoPushToken: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: string;
  priority?: "default" | "normal" | "high";
}): Promise<string | null> => {
  try {
    const response = await axios.post<{
      data?: { id?: string; status?: string; details?: { error?: string } };
    }>(
      EXPO_PUSH_ENDPOINT,
      {
        to: params.expoPushToken,
        title: params.title,
        body: params.body,
        data: params.data ?? {},
        sound: params.sound ? `${params.sound}.wav` : "default",
        priority: params.priority ?? "normal",
        channelId: soundToChannelId(params.sound),
      },
      {
        timeout: 10_000,
        headers: { "Content-Type": "application/json" },
      },
    );

    const ticket = response.data?.data;
    if (ticket?.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
      logger.warn(`DeviceNotRegistered for userId=${params.userId} — clearing push token`);
      await UserNotificationSettingsModel.updateOne(
        { userId: params.userId },
        { $unset: { expoPushToken: "" } },
      );
      return null;
    }

    return ticket?.id ?? null;
  } catch (error) {
    logger.warn(`sendPushNotification failed: ${String(error)}`);
    return null;
  }
};

export const sendImmediateNotification = async (
  params: ImmediateNotificationParams,
): Promise<void> => {
  try {
    const settings = await getSettingsOrDefaults(params.userId);
    if (!settings.notificationsEnabled || !settings.enabledTypes[params.type]) {
      return;
    }

    let ticketId: string | null = null;
    if (settings.expoPushToken) {
      ticketId = await sendPushNotification({
        userId: params.userId,
        expoPushToken: settings.expoPushToken,
        title: params.title,
        body: params.body,
        data: params.data ?? {},
        sound: params.sound ?? "default",
        priority: params.priority === "low" ? "default" : params.priority,
      });
    }

    await logPushAttempt({
      userId: params.userId,
      source: "sendImmediateNotification",
      type: params.type,
      success: Boolean(ticketId) || !settings.expoPushToken,
      pushTokenPresent: Boolean(settings.expoPushToken),
      ticketId,
      reason: settings.expoPushToken ? undefined : "NO_EXPO_PUSH_TOKEN",
    });

    await NotificationModel.create({
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      data: params.data ?? {},
      scheduledFor: new Date(),
      sentAt: new Date(),
      isSent: true,
      isRead: false,
      expoNotificationId: ticketId ?? undefined,
      sound: params.sound ?? "default",
      priority: params.priority ?? "normal",
      isDeleted: false,
    });
  } catch (error) {
    logger.warn(`sendImmediateNotification failed: ${String(error)}`);
  }
};

export const scheduleNotification = async (
  params: ScheduleParams,
): Promise<void> => {
  try {
    const settings = await getSettingsOrDefaults(params.userId);
    if (!settings.notificationsEnabled) {
      return;
    }

    if (!settings.enabledTypes[params.type]) {
      return;
    }

    const profile = await UserProfileModel.findOne({
      userId: params.userId,
    }).lean();
    const timezone = profile?.location.timezone ?? "Asia/Kolkata";

    let nextSchedule = params.scheduledFor;
    const localDate = toZonedTime(nextSchedule, timezone);

    if (
      isWithinQuietHours(
        localDate,
        settings.quietHoursStart,
        settings.quietHoursEnd,
      )
    ) {
      nextSchedule = rescheduleToQuietEnd(
        nextSchedule,
        timezone,
        settings.quietHoursEnd,
      );
    }

    const localDay = formatInTimeZone(nextSchedule, timezone, "yyyy-MM-dd");
    const dayStart = fromZonedTime(`${localDay}T00:00:00`, timezone);
    const dayEnd = fromZonedTime(`${localDay}T23:59:59`, timezone);

    const existing = await NotificationModel.findOne({
      userId: params.userId,
      type: params.type,
      isSent: false,
      isDeleted: false,
      scheduledFor: {
        $gte: dayStart,
        $lte: dayEnd,
      },
    }).lean();

    if (existing) {
      return;
    }

    await NotificationModel.create({
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      data: params.data ?? {},
      scheduledFor: nextSchedule,
      isSent: false,
      isRead: false,
      sound: params.sound ?? "default",
      priority: params.priority ?? "normal",
      isDeleted: false,
    });
  } catch (error) {
    logger.warn(`scheduleNotification failed: ${String(error)}`);
  }
};

export const buildDailyNotifications = async (
  userId: string,
  plan: IDietPlan,
  profile: IUserProfile,
  date: string,
): Promise<void> => {
  const timezone = profile.location.timezone;
  const settings = await getSettingsOrDefaults(userId);

  const dayStart = fromZonedTime(`${date}T00:00:00`, timezone);
  const dayEnd = fromZonedTime(`${date}T23:59:59`, timezone);

  await NotificationModel.deleteMany({
    userId,
    isSent: false,
    isDeleted: false,
    scheduledFor: { $gte: dayStart, $lte: dayEnd },
  });

  const notifications: Omit<
    INotification,
    "_id" | "createdAt" | "updatedAt"
  >[] = [];

  const add = (item: {
    type: INotification["type"];
    title: string;
    body: string;
    localTime: string;
    data?: Record<string, unknown>;
    sound?: INotification["sound"];
    priority?: INotification["priority"];
    onDate?: string;
  }) => {
    notifications.push({
      userId,
      type: item.type,
      title: item.title,
      body: item.body,
      data: item.data ?? {},
      scheduledFor: localDateTimeToUtc(
        item.onDate ?? date,
        item.localTime,
        timezone,
      ),
      isSent: false,
      isRead: false,
      sound: item.sound ?? "default",
      priority: item.priority ?? "normal",
      isDeleted: false,
    });
  };

  const wakeUtc = localDateTimeToUtc(date, profile.schedule.wakeTime, timezone);
  const wakeLocal = toZonedTime(wakeUtc, timezone);

  const firstMeal = plan.meals[0];
  const lunchMeal = asMeal(plan, (label) => label.includes("lunch"));
  const eveningSnack = asMeal(
    plan,
    (label) => label.includes("snack") || label.includes("evening"),
  );
  const preWorkoutMeal = asMeal(plan, (label) => label.includes("pre-workout"));
  const postWorkoutMeal = asMeal(plan, (label) =>
    label.includes("post-workout"),
  );
  const dinnerMeal = asMeal(plan, (label) => label.includes("dinner"));

  const skinMorningTips = [
    "Apply sunscreen before stepping out — SPF 30+ minimum.",
    "Wash your face with cold water to reduce morning puffiness.",
    "Apply moisturiser while skin is still slightly damp.",
    "Vitamin C serum in the morning protects against UV damage.",
    "Don't skip lip balm — lips lose moisture fast in AC offices.",
  ];

  const walkTips = [
    "Even a 10-min walk after lunch boosts digestion by 30%.",
    "Quick walk time! It controls blood sugar spikes after meals.",
    "Your post-lunch walk window is open. 10 mins is enough!",
    "Walking after eating = better energy for the afternoon.",
  ];

  const deskTips = [
    "Stand up and stretch for 2 minutes. Your spine will thank you.",
    "20-20-20 rule: look 20ft away for 20 seconds, every 20 mins.",
    "Roll your shoulders back 5 times. Desk posture reset.",
    "Quick neck stretch: ear to shoulder, hold 10 seconds each side.",
    "Blink more! Screen work reduces blink rate by 60%.",
  ];

  const skinNightTips = [
    "Cleanse + moisturise before bed. Your skin repairs at night.",
    "Apply a thin layer of aloe vera gel before sleeping.",
    "Remove all screen time 30 mins before bed for better skin.",
    "Silk pillowcase reduces skin friction and hair breakage.",
    "Night cream or coconut oil on face = morning glow.",
  ];

  add({
    type: "energy_checkin",
    title: `Good morning, ${profile.name}! 🌅`,
    body: "How's your energy today? Quick check-in to personalise your day.",
    localTime: format(addMinutes(wakeLocal, 5), "HH:mm"),
    data: { screen: "dashboard", action: "energy_checkin" },
    sound: "gentle",
    priority: "normal",
  });

  const todaysQuote = await getQuoteForNotification(userId, date);
  add({
    type: "daily_quote",
    title: todaysQuote.notificationTitle,
    body: `${todaysQuote.text} — ${todaysQuote.author}`,
    localTime: format(addMinutes(wakeLocal, 10), "HH:mm"),
    data: { screen: "dashboard", action: "quote", category: todaysQuote.category },
    sound: "gentle",
    priority: "low",
  });

  if (firstMeal) {
    add({
      type: "meal_checkin",
      title: "Breakfast time! 🥣",
      body: `Did you have your ${firstMeal.label}? (${firstMeal.items[0]?.name ?? "meal"} + more)`,
      localTime: firstMeal.timeSlot,
      data: {
        screen: "plan",
        mealId: firstMeal.id,
        action: "meal_checkin",
        date,
      },
      sound: "chime",
      priority: "normal",
    });
  }

  add({
    type: "water_reminder",
    title: "Hydration check 💧",
    body: `Start your day with a glass of water. Goal: ${profile.hydrationGoalMl}ml today.`,
    localTime: format(addMinutes(wakeLocal, 30), "HH:mm"),
    data: { screen: "dashboard", action: "water" },
    sound: "gentle",
    priority: "low",
  });

  add({
    type: "skin_care",
    title: "Morning skin care ✨",
    body: chooseRandom(skinMorningTips),
    localTime: format(addMinutes(wakeLocal, 45), "HH:mm"),
    data: { screen: "dashboard", action: "tip" },
    sound: "gentle",
    priority: "low",
  });

  add({
    type: "water_reminder",
    title: "Water break 💧",
    body: "Time for your mid-morning water. Stay ahead of thirst.",
    localTime: format(addMinutes(wakeLocal, 150), "HH:mm"),
    sound: "gentle",
    priority: "low",
  });

  if (lunchMeal) {
    const lunchLocal = lunchMeal.timeSlot;

    add({
      type: "meal_checkin",
      title: "Lunch time! 🍱",
      body: `Did you have your lunch? (${lunchMeal.items[0]?.name ?? "meal"} + more)`,
      localTime: lunchLocal,
      data: {
        screen: "plan",
        mealId: lunchMeal.id,
        action: "meal_checkin",
        date,
      },
      sound: "chime",
      priority: "normal",
    });

    const lunchUtc = localDateTimeToUtc(date, lunchLocal, timezone);
    add({
      type: "walk_reminder",
      title: "Post-lunch walk 🚶",
      body: chooseRandom(walkTips),
      localTime: format(
        addMinutes(toZonedTime(lunchUtc, timezone), 20),
        "HH:mm",
      ),
      data: { screen: "dashboard", action: "walk" },
      sound: "gentle",
      priority: "normal",
    });
  }

  const afternoonBaseLocal = profile.schedule.officeStart
    ? toZonedTime(
        localDateTimeToUtc(date, profile.schedule.officeStart, timezone),
        timezone,
      )
    : wakeLocal;
  const afternoonWaterLocal = addMinutes(afternoonBaseLocal, profile.schedule.officeStart ? 4 * 60 : 8 * 60);
  const afternoonWalkLocal = addMinutes(afternoonWaterLocal, 30);

  add({
    type: "water_reminder",
    title: "Afternoon hydration 💧",
    body: "Midday slump incoming. Water first, coffee second.",
    localTime: format(afternoonWaterLocal, "HH:mm"),
    sound: "gentle",
    priority: "low",
  });

  add({
    type: "walk_reminder",
    title: "Body break ⚡",
    body: chooseRandom(deskTips),
    localTime: format(afternoonWalkLocal, "HH:mm"),
    sound: "gentle",
    priority: "low",
  });

  if (eveningSnack) {
    add({
      type: "meal_checkin",
      title: "Evening snack time 🫘",
      body: `Time for your ${eveningSnack.label}. (${eveningSnack.items[0]?.name ?? "meal"})`,
      localTime: eveningSnack.timeSlot,
      data: {
        screen: "plan",
        mealId: eveningSnack.id,
        action: "meal_checkin",
        date,
      },
      sound: "chime",
      priority: "normal",
    });
  }

  const activeTraining = ["gym", "home", "run", "yoga"].includes(
    profile.activityType,
  );
  const gymStart = profile.schedule.gymStart;
  const gymEnd = profile.schedule.gymEnd;

  if (activeTraining && gymStart && preWorkoutMeal) {
    const gymStartUtc = localDateTimeToUtc(date, gymStart, timezone);
    add({
      type: "meal_checkin",
      title: "Pre-workout fuel ⚡",
      body: `Time for your pre-workout meal. ${preWorkoutMeal.items[0]?.name ?? "meal"} ready?`,
      localTime: format(
        subMinutes(toZonedTime(gymStartUtc, timezone), 45),
        "HH:mm",
      ),
      data: {
        screen: "plan",
        mealId: preWorkoutMeal.id,
        action: "meal_checkin",
        date,
      },
      sound: "alert",
      priority: "high",
    });
  }

  if (activeTraining && gymEnd) {
    const gymEndUtc = localDateTimeToUtc(date, gymEnd, timezone);
    const gymEndLocal = toZonedTime(gymEndUtc, timezone);

    add({
      type: "gym_log",
      title: "Great workout! 💪",
      body: "Log which muscles you hit today so we can plan tomorrow's recovery diet.",
      localTime: format(addMinutes(gymEndLocal, 15), "HH:mm"),
      data: { screen: "dashboard", action: "gym_log" },
      sound: "chime",
      priority: "high",
    });

    if (postWorkoutMeal) {
      add({
        type: "meal_checkin",
        title: "Post-workout nutrition 🥛",
        body: `Have your post-workout meal within 30 mins for best recovery. ${postWorkoutMeal.items[0]?.name ?? "meal"}`,
        localTime: format(addMinutes(gymEndLocal, 30), "HH:mm"),
        data: {
          screen: "plan",
          mealId: postWorkoutMeal.id,
          action: "meal_checkin",
          date,
        },
        sound: "chime",
        priority: "high",
      });
    }
  }

  if (dinnerMeal) {
    add({
      type: "meal_checkin",
      title: "Dinner time 🍽️",
      body: `Did you have dinner? (${dinnerMeal.items[0]?.name ?? "meal"} + more)`,
      localTime: dinnerMeal.timeSlot,
      data: {
        screen: "plan",
        mealId: dinnerMeal.id,
        action: "meal_checkin",
        date,
      },
      sound: "chime",
      priority: "normal",
    });
  }

  const sleepUtc = localDateTimeToUtc(
    date,
    profile.schedule.sleepTime,
    timezone,
  );
  const sleepLocal = toZonedTime(sleepUtc, timezone);

  add({
    type: "skin_care",
    title: "Night skin care 🌙",
    body: chooseRandom(skinNightTips),
    localTime: format(addMinutes(sleepLocal, -60), "HH:mm"),
    sound: "gentle",
    priority: "low",
  });

  add({
    type: "sleep_checkin",
    title: "Sleep quality tracker 😴",
    body: "Rate last night's sleep before you wind down. It helps us improve your plan.",
    localTime: format(addMinutes(sleepLocal, -30), "HH:mm"),
    data: { screen: "dashboard", action: "sleep_checkin" },
    sound: "gentle",
    priority: "normal",
  });

  const tonight = format(subDays(new Date(date), 1), "yyyy-MM-dd");
  for (const task of plan.prepTasks) {
    add({
      type: "prep_task",
      title: "Tonight's prep 🫙",
      body: task.instruction,
      localTime: task.scheduledFor,
      onDate: tonight,
      data: { screen: "plan", taskId: task.id, action: "prep_task", date },
      sound: "alert",
      priority: "high",
    });
  }

  const waterTips = [
    "Sip water now — small sips throughout the day work best.",
    "Hydration reminder: your body and skin need this break.",
    "Quick water break 💧",
    "Refill your bottle and take a few sips now.",
    "Water first. Energy follows.",
  ];

  const wakeMinutes = parseHHMM(profile.schedule.wakeTime);
  const sleepMinutes = parseHHMM(profile.schedule.sleepTime);
  const startMins = wakeMinutes.hour * 60 + wakeMinutes.minute;
  const endMins = sleepMinutes.hour * 60 + sleepMinutes.minute - 30;
  const interval = Math.max(30, settings.waterReminderIntervalMinutes || 90);

  const occupiedUtc = notifications.map((notification) =>
    notification.scheduledFor.getTime(),
  );

  for (let cursor = startMins; cursor <= endMins; cursor += interval) {
    const hh = Math.floor(cursor / 60)
      .toString()
      .padStart(2, "0");
    const mm = (cursor % 60).toString().padStart(2, "0");
    const whenUtc = localDateTimeToUtc(date, `${hh}:${mm}`, timezone);

    const overlaps = occupiedUtc.some(
      (time) => Math.abs(time - whenUtc.getTime()) <= 15 * 60 * 1000,
    );

    if (overlaps) {
      continue;
    }

    notifications.push({
      userId,
      type: "water_reminder",
      title: "Hydration reminder 💧",
      body: chooseRandom(waterTips),
      data: { screen: "dashboard", action: "water" },
      scheduledFor: whenUtc,
      isSent: false,
      isRead: false,
      sound: "gentle",
      priority: "low",
      isDeleted: false,
    });
  }

  if (notifications.length) {
    await NotificationModel.insertMany(notifications);
  }

  logger.info(
    `Built ${notifications.length} notifications for user ${userId} for date ${date}`,
  );
};

export const sendPlanReadyNotification = async (
  userId: string,
): Promise<void> => {
  try {
    const settings = await getSettingsOrDefaults(userId);
    if (!settings.notificationsEnabled || !settings.enabledTypes.plan_ready) {
      return;
    }

    const title = "Your plan for tomorrow is ready! 🥗";
    const body = "Check your AHAR diet plan and tonight's prep tasks.";
    let ticketId: string | null = null;

    if (settings.expoPushToken) {
      ticketId = await sendPushNotification({
        userId,
        expoPushToken: settings.expoPushToken,
        title,
        body,
        data: { screen: "plan", tab: "tomorrow" },
        sound: "chime",
        priority: "high",
      });
    }

    await logPushAttempt({
      userId,
      source: "sendPlanReadyNotification",
      type: "plan_ready",
      success: Boolean(ticketId) || !settings.expoPushToken,
      pushTokenPresent: Boolean(settings.expoPushToken),
      ticketId,
      reason: settings.expoPushToken ? undefined : "NO_EXPO_PUSH_TOKEN",
    });

    await NotificationModel.create({
      userId,
      type: "plan_ready",
      title,
      body,
      data: { screen: "plan", tab: "tomorrow" },
      scheduledFor: new Date(),
      sentAt: new Date(),
      isSent: true,
      isRead: false,
      expoNotificationId: ticketId ?? undefined,
      sound: "chime",
      priority: "high",
      isDeleted: false,
    });
  } catch (error) {
    logger.warn(
      `sendPlanReadyNotification failed for user=${userId}: ${String(error)}`,
    );
  }
};

export const scheduleGroceryReadyNotification = async (
  userId: string,
  planDate: string,
  groceryCount: number,
): Promise<void> => {
  try {
    const settings = await getSettingsOrDefaults(userId);
    if (
      !settings.notificationsEnabled ||
      !settings.enabledTypes.grocery_ready
    ) {
      return;
    }

    // Fire 10 minutes after plan generation (now + 10 min)
    const scheduledFor = addMinutes(new Date(), 10);

    await NotificationModel.create({
      userId,
      type: "grocery_ready",
      title: "Grocery list ready 🛒",
      body:
        groceryCount > 0
          ? `Your shopping list for ${planDate} has ${groceryCount} item${groceryCount === 1 ? "" : "s"}. Check what to pick up.`
          : `Your grocery list for ${planDate} is ready. Tap to review.`,
      data: { screen: "plan", tab: "grocery", date: planDate },
      scheduledFor,
      isSent: false,
      isRead: false,
      sound: "chime",
      priority: "normal",
      isDeleted: false,
    });
  } catch (error) {
    logger.warn(
      `scheduleGroceryReadyNotification failed for user=${userId}: ${String(error)}`,
    );
  }
};

export const sendMacroAlert = async (
  userId: string,
  deficit: {
    protein?: number;
    carbs?: number;
    calories?: number;
  },
): Promise<void> => {
  try {
    const proteinDeficit = deficit.protein ?? 0;
    const caloriesDeficit = deficit.calories ?? 0;

    const deficitMessage =
      proteinDeficit > 20
        ? `You're ${Math.round(proteinDeficit)}g short on protein today.`
        : caloriesDeficit > 300
          ? `You've eaten ${Math.round(caloriesDeficit)} fewer kcal today.`
          : "Your macros are drifting from target today.";

    const suggestion =
      proteinDeficit > 20
        ? "have a glass of milk or handful of peanuts"
        : "have a banana or handful of mixed nuts";

    const title = "Nutrition alert ⚠️";
    const body = `${deficitMessage} Quick fix: ${suggestion}`;

    const settings = await getSettingsOrDefaults(userId);
    if (!settings.notificationsEnabled || !settings.enabledTypes.macro_alert) {
      return;
    }

    let ticketId: string | null = null;
    if (settings.expoPushToken) {
      ticketId = await sendPushNotification({
        userId,
        expoPushToken: settings.expoPushToken,
        title,
        body,
        data: { screen: "dashboard", action: "macro_alert" },
        sound: "alert",
        priority: "high",
      });
    }

    await logPushAttempt({
      userId,
      source: "sendMacroAlert",
      type: "macro_alert",
      success: Boolean(ticketId) || !settings.expoPushToken,
      pushTokenPresent: Boolean(settings.expoPushToken),
      ticketId,
      reason: settings.expoPushToken ? undefined : "NO_EXPO_PUSH_TOKEN",
    });

    await NotificationModel.create({
      userId,
      type: "macro_alert",
      title,
      body,
      data: { screen: "dashboard", action: "macro_alert" },
      scheduledFor: new Date(),
      sentAt: new Date(),
      isSent: true,
      isRead: false,
      expoNotificationId: ticketId ?? undefined,
      sound: "alert",
      priority: "high",
      isDeleted: false,
    });
  } catch (error) {
    logger.warn(`sendMacroAlert failed for user=${userId}: ${String(error)}`);
  }
};
