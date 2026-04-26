import type { RequestHandler } from "express";
import { addDays, endOfISOWeek, format, startOfISOWeek } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { z } from "zod";

import { ActivityLogModel } from "../models/ActivityLog";
import { DailyLogModel } from "../models/DailyLog";
import { GymLogModel } from "../models/GymLog";
import { UserProfileModel } from "../models/UserProfile";
import { logger } from "../utils/logger";
import { awardBadge } from "../services/badgeService";
import { UnauthorisedError } from "../utils/errors";
import { scheduleNotification } from "../services/notificationService";
import { getAllStreaks, updateStreak } from "../services/streakService";

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), {
    message: "Invalid date",
  });

export const logGymSchema = z.object({
  date: dateSchema,
  musclesHit: z.array(z.string().min(1)),
  activityType: z.enum(["gym", "run", "walk", "home", "yoga", "rest"]),
  durationMinutes: z.number().int().positive().optional(),
  notes: z.string().optional(),
});

export const clientErrorSchema = z.object({
  error: z.string().min(1),
  stack: z.string().optional(),
  screen: z.string().optional(),
});

const getProfile = async (userId: string) => {
  const profile = await UserProfileModel.findOne({
    userId,
    isDeleted: { $ne: true },
  }).lean();

  if (!profile) {
    throw new Error("PROFILE_NOT_FOUND");
  }

  return profile;
};

export const logGym: RequestHandler = async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new UnauthorisedError();
    }

    const payload = req.body as z.infer<typeof logGymSchema>;
    const profile = await getProfile(req.userId);

    const gymLog = await GymLogModel.findOneAndUpdate(
      { userId: req.userId, date: payload.date, isDeleted: false },
      {
        $set: {
          userId: req.userId,
          date: payload.date,
          musclesHit: payload.musclesHit,
          activityType: payload.activityType,
          durationMinutes: payload.durationMinutes,
          notes: payload.notes,
          isDeleted: false,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    if (!gymLog) {
      throw new Error("GYM_LOG_SAVE_FAILED");
    }

    await updateStreak(req.userId, "gym");

    const loggedDate = new Date(`${payload.date}T12:00:00Z`);
    const weekStart = format(startOfISOWeek(loggedDate), "yyyy-MM-dd");
    const weekEnd = format(endOfISOWeek(loggedDate), "yyyy-MM-dd");
    const gymSessionsThisWeek = await GymLogModel.countDocuments({
      userId: req.userId,
      isDeleted: false,
      activityType: { $ne: "rest" },
      date: { $gte: weekStart, $lte: weekEnd },
    });
    if (gymSessionsThisWeek >= 5) {
      await awardBadge(req.userId, "gym_week");
    }

    const hitLegs = payload.musclesHit.some((muscle) => {
      const normalized = muscle.toLowerCase();
      return normalized.includes("legs") || normalized.includes("full body");
    });

    if (hitLegs) {
      const timezone = profile.location.timezone;
      const tomorrow = formatInTimeZone(
        addDays(new Date(), 1),
        timezone,
        "yyyy-MM-dd",
      );
      const recoveryTime = fromZonedTime(
        `${tomorrow}T${profile.schedule.wakeTime}:00`,
        timezone,
      );

      await scheduleNotification({
        userId: req.userId,
        type: "prep_task",
        title: "Leg day recovery 🦵",
        body: "You hit legs yesterday. Today's plan has extra anti-inflammatory foods.",
        scheduledFor: recoveryTime,
        data: { screen: "plan", action: "leg_recovery", date: tomorrow },
        sound: "gentle",
        priority: "normal",
      });
    }

    await ActivityLogModel.create({
      userId: req.userId,
      action: "gym_logged",
      metadata: { musclesHit: payload.musclesHit },
      timestamp: new Date(),
    });

    res.status(200).json({ success: true, data: { gymLog } });
  } catch (error) {
    next(error);
  }
};

export const getGymHistory: RequestHandler = async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new UnauthorisedError();
    }

    const limit = Math.max(1, Math.min(100, Number(req.query.limit ?? 30)));
    const offset = Math.max(0, Number(req.query.offset ?? 0));

    const logs = await GymLogModel.find({
      userId: req.userId,
      isDeleted: false,
    })
      .sort({ date: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    res.status(200).json({ success: true, data: { logs, limit, offset } });
  } catch (error) {
    next(error);
  }
};

export const getWeekHistory: RequestHandler = async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new UnauthorisedError();
    }

    const profile = await getProfile(req.userId);
    const today = new Date();
    const dates = Array.from({ length: 7 }, (_, index) =>
      formatInTimeZone(
        addDays(today, -index),
        profile.location.timezone,
        "yyyy-MM-dd",
      ),
    );

    const [dailyLogs, gymLogs] = await Promise.all([
      DailyLogModel.find({
        userId: req.userId,
        date: { $in: dates },
        isDeleted: false,
      }).lean(),
      GymLogModel.find({
        userId: req.userId,
        date: { $in: dates },
        isDeleted: false,
      }).lean(),
    ]);

    const merged = dates.map((date) => ({
      date,
      dailyLog: dailyLogs.find((entry) => entry.date === date) ?? null,
      gymLog: gymLogs.find((entry) => entry.date === date) ?? null,
    }));

    res.status(200).json({ success: true, data: { days: merged } });
  } catch (error) {
    next(error);
  }
};

export const getAllStreaksForUser: RequestHandler = async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new UnauthorisedError();
    }

    const streaks = await getAllStreaks(req.userId);
    res.status(200).json({ success: true, data: { streaks } });
  } catch (error) {
    next(error);
  }
};

export const logClientError: RequestHandler = async (req, res) => {
  const payload = req.body as z.infer<typeof clientErrorSchema>;
  logger.error(
    `ClientError screen=${payload.screen ?? "unknown"} message=${payload.error} stack=${payload.stack ?? "n/a"}`,
  );
  res.status(200).json({ success: true });
};
