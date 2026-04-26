import type { RequestHandler } from "express";
import { z } from "zod";

import { ActivityLogModel } from "../models/ActivityLog";
import { NotFoundError, UnauthorisedError } from "../utils/errors";
import { UserProfileModel } from "../models/UserProfile";
import { WeeklyCheckinModel } from "../models/WeeklyCheckin";
import { WeightLogModel } from "../models/WeightLog";
import {
  calculateNutritionTargets,
  generateWeeklySummaryForUser,
  getProgressStats,
  getWeeklySummaryByDate,
  getWeeklySummaryByRange,
  markBadgesSeen,
  saveManualWeightLog,
  shouldRecalculateForWeightChange,
} from "../services/weeklyCheckinService";

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), {
    message: "Invalid date",
  });

export const checkinPayloadSchema = z.object({
  weight: z.number().min(20).max(400),
  weekStart: dateSchema.optional(),
  weekEnd: dateSchema.optional(),
});

export const weightLogSchema = z.object({
  date: dateSchema,
  weightKg: z.number().min(20).max(400),
  bodyFatPercent: z.number().min(3).max(70).optional(),
  muscleMassKg: z.number().min(10).max(200).optional(),
  notes: z.string().max(300).optional(),
});

const weekRangeQuerySchema = z.object({
  weekStart: dateSchema,
  weekEnd: dateSchema,
});

export const submitWeeklyCheckin: RequestHandler = async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new UnauthorisedError();
    }

    const payload = req.body as z.infer<typeof checkinPayloadSchema>;

    const profile = await UserProfileModel.findOne({
      userId: req.userId,
      isDeleted: { $ne: true },
    });

    if (!profile) {
      throw new NotFoundError("Profile not found");
    }

    const currentWeight = profile.weight;
    const nextWeight = payload.weight;

    if (shouldRecalculateForWeightChange(currentWeight, nextWeight)) {
      const updatedProfileData = {
        ...profile.toObject(),
        weight: nextWeight,
      };
      const nutrition = calculateNutritionTargets(updatedProfileData);

      await UserProfileModel.updateOne(
        { userId: req.userId },
        {
          $set: {
            weight: nextWeight,
            tdee: nutrition.tdee,
            hydrationGoalMl: nutrition.hydrationGoalMl,
            macros: nutrition.macros,
          },
        },
      );
    } else {
      await UserProfileModel.updateOne(
        { userId: req.userId },
        {
          $set: {
            weight: nextWeight,
          },
        },
      );
    }

    void generateWeeklySummaryForUser(req.userId, payload.weight);

    await ActivityLogModel.create({
      userId: req.userId,
      action: "weekly_checkin_submitted",
      metadata: {
        weight: payload.weight,
      },
      timestamp: new Date(),
    });

    res.status(202).json({
      success: true,
      data: {
        status: "processing",
        message: "Weekly summary generation started",
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getWeeklySummary: RequestHandler = async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new UnauthorisedError();
    }

    const weekStart =
      typeof req.query.weekStart === "string" ? req.query.weekStart : undefined;
    const weekEnd =
      typeof req.query.weekEnd === "string" ? req.query.weekEnd : undefined;
    const date =
      typeof req.query.date === "string" ? req.query.date : undefined;

    let summary = null;

    if (weekStart && weekEnd) {
      const range = weekRangeQuerySchema.parse({ weekStart, weekEnd });
      summary = await getWeeklySummaryByRange(
        req.userId,
        range.weekStart,
        range.weekEnd,
      );
    } else if (date) {
      const parsedDate = dateSchema.parse(date);
      summary = await getWeeklySummaryByDate(req.userId, parsedDate);
    } else {
      summary = await WeeklyCheckinModel.findOne({
        userId: req.userId,
        isDeleted: false,
      })
        .sort({ weekStart: -1 })
        .lean();
    }

    res.status(200).json({
      success: true,
      data: {
        summary,
        status: summary?.status ?? "pending",
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getProgressStatsController: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    if (!req.userId) {
      throw new UnauthorisedError();
    }

    const stats = await getProgressStats(req.userId);

    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

export const getProgressHistoryController: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    if (!req.userId) {
      throw new UnauthorisedError();
    }

    const [weeklyCheckins, weightLogs] = await Promise.all([
      WeeklyCheckinModel.find({ userId: req.userId, isDeleted: false })
        .sort({ weekStart: -1 })
        .limit(24)
        .lean(),
      WeightLogModel.find({ userId: req.userId, isDeleted: false })
        .sort({ date: -1 })
        .limit(52)
        .lean(),
    ]);

    res.status(200).json({
      success: true,
      data: {
        weeklyCheckins,
        weightLogs,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const addWeightLogController: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    if (!req.userId) {
      throw new UnauthorisedError();
    }

    const payload = req.body as z.infer<typeof weightLogSchema>;
    const weightLog = await saveManualWeightLog(req.userId, payload);

    await ActivityLogModel.create({
      userId: req.userId,
      action: "weight_logged",
      metadata: {
        date: payload.date,
        weightKg: payload.weightKg,
      },
      timestamp: new Date(),
    });

    res.status(201).json({ success: true, data: { weightLog } });
  } catch (error) {
    next(error);
  }
};

export const markBadgesSeenController: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    if (!req.userId) {
      throw new UnauthorisedError();
    }

    const updated = await markBadgesSeen(req.userId);

    res.status(200).json({ success: true, data: { updated } });
  } catch (error) {
    next(error);
  }
};
