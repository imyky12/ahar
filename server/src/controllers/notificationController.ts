import type { RequestHandler } from "express";
import { z } from "zod";

import { ActivityLogModel } from "../models/ActivityLog";
import { DietPlanModel } from "../models/DietPlan";
import { NotificationModel } from "../models/Notification";
import { UserProfileModel } from "../models/UserProfile";
import {
  UserNotificationSettingsModel,
  type IUserNotificationSettings,
} from "../models/UserNotificationSettings";
import { buildDailyNotifications } from "../services/notificationService";
import { NotFoundError, UnauthorisedError } from "../utils/errors";

export const tokenSchema = z.object({
  expoPushToken: z
    .string()
    .min(1)
    .refine((token) => token.startsWith("ExponentPushToken["), {
      message: "Invalid Expo token format",
    }),
});

export const markReadSchema = z.object({
  notificationIds: z.array(z.string().min(1)).min(1),
});

export const updateSettingsSchema = z.object({
  notificationsEnabled: z.boolean().optional(),
  quietHoursStart: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .optional(),
  quietHoursEnd: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .optional(),
  enabledTypes: z
    .object({
      plan_ready: z.boolean().optional(),
      prep_task: z.boolean().optional(),
      meal_checkin: z.boolean().optional(),
      water_reminder: z.boolean().optional(),
      walk_reminder: z.boolean().optional(),
      skin_care: z.boolean().optional(),
      supplement: z.boolean().optional(),
      gym_log: z.boolean().optional(),
      sleep_checkin: z.boolean().optional(),
      macro_alert: z.boolean().optional(),
      weekly_checkin: z.boolean().optional(),
      energy_checkin: z.boolean().optional(),
      grocery_ready: z.boolean().optional(),
      streak_milestone: z.boolean().optional(),
      daily_quote: z.boolean().optional(),
      medicine_reminder: z.boolean().optional(),
    })
    .optional(),
  waterReminderIntervalMinutes: z.number().min(30).max(180).optional(),
});

export const emptyPayloadSchema = z.object({}).passthrough();

const defaultSettings = (
  userId: string,
): Omit<IUserNotificationSettings, "_id" | "createdAt" | "updatedAt"> => ({
  userId,
  notificationsEnabled: true,
  quietHoursStart: "23:00",
  quietHoursEnd: "07:00",
  enabledTypes: {
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
  },
  waterReminderIntervalMinutes: 90,
  quotePreference: "motivational",
  isDeleted: false,
});

export const registerToken: RequestHandler = async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new UnauthorisedError();
    }

    const payload = req.body as z.infer<typeof tokenSchema>;

    await UserNotificationSettingsModel.findOneAndUpdate(
      { userId: req.userId },
      {
        $set: {
          expoPushToken: payload.expoPushToken,
          isDeleted: false,
        },
        $setOnInsert: {
          userId: req.userId,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    await ActivityLogModel.create({
      userId: req.userId,
      action: "push_token_registered",
      metadata: {},
      timestamp: new Date(),
    });

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const getNotificationHistory: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    if (!req.userId) {
      throw new UnauthorisedError();
    }

    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.max(1, Math.min(100, Number(req.query.limit ?? 20)));

    const [notifications, total] = await Promise.all([
      NotificationModel.find({ userId: req.userId, isDeleted: false })
        .sort({ scheduledFor: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      NotificationModel.countDocuments({
        userId: req.userId,
        isDeleted: false,
      }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        notifications,
        total,
        page,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const markAsRead: RequestHandler = async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new UnauthorisedError();
    }

    const payload = req.body as z.infer<typeof markReadSchema>;

    await NotificationModel.updateMany(
      {
        _id: { $in: payload.notificationIds },
        userId: req.userId,
        isDeleted: false,
      },
      {
        $set: { isRead: true },
      },
    );

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const getSettings: RequestHandler = async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new UnauthorisedError();
    }

    const settings = await UserNotificationSettingsModel.findOne({
      userId: req.userId,
      isDeleted: false,
    }).lean();

    res.status(200).json({
      success: true,
      data: {
        settings: settings ?? defaultSettings(req.userId),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateSettings: RequestHandler = async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new UnauthorisedError();
    }

    const payload = req.body as z.infer<typeof updateSettingsSchema>;

    const updateSet: Record<string, unknown> = {
      isDeleted: false,
    };

    if (typeof payload.notificationsEnabled === "boolean") {
      updateSet.notificationsEnabled = payload.notificationsEnabled;
    }

    if (typeof payload.quietHoursStart === "string") {
      updateSet.quietHoursStart = payload.quietHoursStart;
    }

    if (typeof payload.quietHoursEnd === "string") {
      updateSet.quietHoursEnd = payload.quietHoursEnd;
    }

    if (typeof payload.waterReminderIntervalMinutes === "number") {
      updateSet.waterReminderIntervalMinutes =
        payload.waterReminderIntervalMinutes;
    }

    if (payload.enabledTypes) {
      Object.entries(payload.enabledTypes).forEach(([key, value]) => {
        if (typeof value === "boolean") {
          updateSet[`enabledTypes.${key}`] = value;
        }
      });
    }

    const settings = await UserNotificationSettingsModel.findOneAndUpdate(
      { userId: req.userId },
      {
        $set: updateSet,
        $setOnInsert: {
          userId: req.userId,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();

    await ActivityLogModel.create({
      userId: req.userId,
      action: "notification_settings_updated",
      metadata: { changed: Object.keys(payload) },
      timestamp: new Date(),
    });

    res.status(200).json({ success: true, data: { settings } });
  } catch (error) {
    next(error);
  }
};

export const rescheduleNotifications: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    if (!req.userId) {
      throw new UnauthorisedError();
    }

    const profile = await UserProfileModel.findOne({
      userId: req.userId,
      isDeleted: { $ne: true },
    }).lean();

    if (!profile) {
      throw new NotFoundError("Profile not found");
    }

    const today = new Date().toISOString().slice(0, 10);
    const plan = await DietPlanModel.findOne({
      userId: req.userId,
      date: today,
      isDeleted: false,
    }).lean();

    if (!plan) {
      throw new NotFoundError("No plan for today");
    }

    await NotificationModel.deleteMany({
      userId: req.userId,
      isSent: false,
      isDeleted: false,
    });

    await buildDailyNotifications(req.userId, plan, profile, today);

    await ActivityLogModel.create({
      userId: req.userId,
      action: "notifications_rescheduled",
      metadata: { date: today },
      timestamp: new Date(),
    });

    res.status(200).json({ success: true, data: { message: "Rescheduled" } });
  } catch (error) {
    next(error);
  }
};

export const getNotificationDebug: RequestHandler = async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new UnauthorisedError();
    }

    const settings = await UserNotificationSettingsModel.findOne({
      userId: req.userId,
      isDeleted: false,
    }).lean();

    const [pendingCount, sentCount, unreadCount, pushSentCount, recentLogs] =
      await Promise.all([
        NotificationModel.countDocuments({
          userId: req.userId,
          isDeleted: false,
          isSent: false,
        }),
        NotificationModel.countDocuments({
          userId: req.userId,
          isDeleted: false,
          isSent: true,
        }),
        NotificationModel.countDocuments({
          userId: req.userId,
          isDeleted: false,
          isRead: false,
        }),
        NotificationModel.countDocuments({
          userId: req.userId,
          isDeleted: false,
          isSent: true,
          expoNotificationId: { $exists: true, $ne: "" },
        }),
        ActivityLogModel.find({
          userId: req.userId,
          action: "notification_push_attempt",
        })
          .sort({ timestamp: -1 })
          .limit(20)
          .lean(),
      ]);

    res.status(200).json({
      success: true,
      data: {
        tokenPresent: Boolean(settings?.expoPushToken),
        tokenPreview: settings?.expoPushToken
          ? `${settings.expoPushToken.slice(0, 24)}...`
          : null,
        notificationsEnabled: settings?.notificationsEnabled ?? true,
        counts: {
          pendingCount,
          sentCount,
          unreadCount,
          pushSentCount,
        },
        recentPushAttempts: recentLogs,
      },
    });
  } catch (error) {
    next(error);
  }
};
