import type { RequestHandler } from "express";
import { formatInTimeZone } from "date-fns-tz";
import { fromZonedTime } from "date-fns-tz";
import { z } from "zod";

import { ActivityLogModel } from "../models/ActivityLog";
import { NotFoundError, UnauthorisedError } from "../utils/errors";
import {
  DailyLogModel,
  type IDailyLog,
  type IMealLogEntry,
} from "../models/DailyLog";
import { DietPlanModel, type IMacros } from "../models/DietPlan";
import { MealLogModel } from "../models/MealLog";
import { NotificationModel } from "../models/Notification";
import { UserProfileModel } from "../models/UserProfile";
import { checkAndAwardDailyBadges } from "../services/badgeService";
import { generateAlternatives } from "../services/aiService";
import {
  sendImmediateNotification,
  sendMacroAlert,
} from "../services/notificationService";
import { getAllStreaks, updateStreak } from "../services/streakService";

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), {
    message: "Invalid date",
  });

export const energySchema = z.object({
  date: dateSchema,
  level: z.number().int().min(1).max(5),
  temporaryCondition: z.string().max(100).optional(),
});

export const sleepSchema = z.object({
  date: dateSchema,
  quality: z.number().int().min(1).max(10),
  hoursSlept: z.number().min(1).max(24),
});

export const waterSchema = z.object({
  date: dateSchema,
  amountMl: z.number().min(50).max(2000),
});

export const mealSchema = z.object({
  date: dateSchema,
  mealId: z.string().min(1),
  planId: z.string().min(1),
  status: z.enum(["done", "skipped", "alternative"]),
  alternativeItems: z
    .array(
      z.object({
        name: z.string(),
        quantity: z.string(),
        unit: z.string(),
        macros: z.object({
          protein: z.number(),
          carbs: z.number(),
          fat: z.number(),
          calories: z.number(),
        }),
        cookTimeMinutes: z.number(),
      }),
    )
    .optional(),
});

export const skipSchema = z.object({
  date: dateSchema,
  mealId: z.string().min(1),
  planId: z.string().min(1),
  reason: z.enum(["not_available", "not_eaten", "disliked"]),
});

const zeroMacros = (): IMacros => ({
  protein: 0,
  carbs: 0,
  fat: 0,
  calories: 0,
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

const getDailyLogOrCreate = async (
  userId: string,
  date: string,
): Promise<IDailyLog> => {
  const existing = await DailyLogModel.findOne({
    userId,
    date,
    isDeleted: false,
  });

  if (existing) {
    return existing.toObject();
  }

  const created = await DailyLogModel.create({
    userId,
    date,
    waterIntakeMl: 0,
    waterLogs: [],
    mealLogs: [],
    totalMacrosConsumed: zeroMacros(),
    macroCompliancePercent: 0,
    isDeleted: false,
  });

  return created.toObject();
};

const getMacroSummary = async (userId: string, dailyLog: IDailyLog) => {
  const profile = await getProfile(userId);
  const target = profile.macros;
  const consumed = dailyLog.totalMacrosConsumed ?? zeroMacros();
  const percent =
    target.calories > 0
      ? Math.min(100, Math.round((consumed.calories / target.calories) * 100))
      : 0;
  const deficit = {
    protein: Math.max(0, target.protein - consumed.protein),
    carbs: Math.max(0, target.carbs - consumed.carbs),
    fat: Math.max(0, target.fat - consumed.fat),
    calories: Math.max(0, target.calories - consumed.calories),
  };

  return {
    consumed,
    target,
    percent,
    deficit,
  };
};

const getWaterSummary = async (userId: string, dailyLog: IDailyLog) => {
  const profile = await getProfile(userId);
  const consumed = dailyLog.waterIntakeMl ?? 0;
  const goal = profile.hydrationGoalMl;

  return {
    consumed,
    goal,
    percent: goal > 0 ? Math.min(100, Math.round((consumed / goal) * 100)) : 0,
    logsCount: dailyLog.waterLogs?.length ?? 0,
  };
};

const getMealComplianceSummary = (dailyLog: IDailyLog, totalMeals: number) => {
  const done = dailyLog.mealLogs.filter(
    (entry) => entry.status === "done",
  ).length;
  const skipped = dailyLog.mealLogs.filter(
    (entry) => entry.status === "skipped",
  ).length;
  const pending = Math.max(totalMeals - (done + skipped), 0);

  return {
    total: totalMeals,
    done,
    skipped,
    pending,
    compliancePercent: dailyLog.macroCompliancePercent ?? 0,
  };
};

const createEmptyDailyLog = (userId: string, date: string): IDailyLog => ({
  _id: undefined,
  userId,
  date,
  waterIntakeMl: 0,
  waterLogs: [],
  mealLogs: [],
  totalMacrosConsumed: zeroMacros(),
  macroCompliancePercent: 0,
  isDeleted: false,
  createdAt: new Date(),
  updatedAt: new Date(),
});

export const logEnergy: RequestHandler = async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new UnauthorisedError();
    }

    const payload = req.body as z.infer<typeof energySchema>;
    const dailyLog = await DailyLogModel.findOneAndUpdate(
      { userId: req.userId, date: payload.date, isDeleted: false },
      {
        $set: {
          energyLevel: payload.level,
          temporaryCondition: payload.temporaryCondition ?? null,
          notes:
            payload.level <= 2 ? "Low energy day — plan adjusted" : undefined,
          isDeleted: false,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    if (!dailyLog) {
      throw new Error("DAILY_LOG_SAVE_FAILED");
    }

    if (payload.level <= 2) {
      await sendImmediateNotification({
        userId: req.userId,
        type: "energy_checkin",
        title: "Low energy detected 💙",
        body: "We've lightened today's plan. Focus on iron-rich foods and stay hydrated.",
        data: { screen: "dashboard", action: "energy_checkin" },
        sound: "gentle",
        priority: "normal",
      });
    }

    await ActivityLogModel.create({
      userId: req.userId,
      action: "energy_logged",
      metadata: { level: payload.level },
      timestamp: new Date(),
    });

    res.status(200).json({ success: true, data: { dailyLog } });
  } catch (error) {
    next(error);
  }
};

export const logSleep: RequestHandler = async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new UnauthorisedError();
    }

    const payload = req.body as z.infer<typeof sleepSchema>;
    const dailyLog = await DailyLogModel.findOneAndUpdate(
      { userId: req.userId, date: payload.date, isDeleted: false },
      {
        $set: {
          sleepQuality: payload.quality,
          hoursSlept: payload.hoursSlept,
          isDeleted: false,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    if (!dailyLog) {
      throw new Error("DAILY_LOG_SAVE_FAILED");
    }

    await updateStreak(req.userId, "sleep");

    await ActivityLogModel.create({
      userId: req.userId,
      action: "sleep_logged",
      metadata: { quality: payload.quality, hoursSlept: payload.hoursSlept },
      timestamp: new Date(),
    });

    res.status(200).json({ success: true, data: { dailyLog } });
  } catch (error) {
    next(error);
  }
};

export const logWater: RequestHandler = async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new UnauthorisedError();
    }

    const payload = req.body as z.infer<typeof waterSchema>;
    const profile = await getProfile(req.userId);
    const existing = await DailyLogModel.findOne({
      userId: req.userId,
      date: payload.date,
      isDeleted: false,
    });

    const dailyLog =
      existing ??
      new DailyLogModel({
        userId: req.userId,
        date: payload.date,
        waterIntakeMl: 0,
        waterLogs: [],
        mealLogs: [],
        totalMacrosConsumed: zeroMacros(),
        macroCompliancePercent: 0,
        isDeleted: false,
      });

    dailyLog.waterLogs.push({ amount: payload.amountMl, loggedAt: new Date() });
    dailyLog.waterIntakeMl = (dailyLog.waterIntakeMl ?? 0) + payload.amountMl;
    const saved = await dailyLog.save();

    if (saved.waterIntakeMl >= profile.hydrationGoalMl) {
      const timezone = profile.location.timezone;
      const dayStart = fromZonedTime(`${payload.date}T00:00:00`, timezone);
      const dayEnd = fromZonedTime(`${payload.date}T23:59:59`, timezone);

      await NotificationModel.updateMany(
        {
          userId: req.userId,
          type: "water_reminder",
          isSent: false,
          isDeleted: false,
          scheduledFor: {
            $gte: dayStart,
            $lte: dayEnd,
          },
        },
        {
          $set: { isDeleted: true },
        },
      );

      await updateStreak(req.userId, "water");
    }

    await ActivityLogModel.create({
      userId: req.userId,
      action: "water_logged",
      metadata: { amountMl: payload.amountMl },
      timestamp: new Date(),
    });

    res.status(200).json({
      success: true,
      data: {
        waterIntakeMl: saved.waterIntakeMl,
        hydrationGoalMl: profile.hydrationGoalMl,
        percentComplete:
          profile.hydrationGoalMl > 0
            ? Math.min(
                100,
                Math.round(
                  (saved.waterIntakeMl / profile.hydrationGoalMl) * 100,
                ),
              )
            : 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logMeal: RequestHandler = async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new UnauthorisedError();
    }

    const payload = req.body as z.infer<typeof mealSchema>;
    const profile = await getProfile(req.userId);
    const plan = await DietPlanModel.findOne({
      _id: payload.planId,
      userId: req.userId,
      isDeleted: false,
    });

    if (!plan) {
      throw new NotFoundError("Plan not found");
    }

    const meal = plan.meals.find((entry) => entry.id === payload.mealId);
    if (!meal) {
      throw new NotFoundError("Meal not found");
    }

    const macrosConsumed: IMacros =
      payload.status === "done"
        ? meal.totalMacros
        : payload.status === "skipped"
          ? zeroMacros()
          : (payload.alternativeItems ?? []).reduce<IMacros>(
              (acc, item) => ({
                protein: acc.protein + item.macros.protein,
                carbs: acc.carbs + item.macros.carbs,
                fat: acc.fat + item.macros.fat,
                calories: acc.calories + item.macros.calories,
              }),
              zeroMacros(),
            );

    meal.status = payload.status;
    if (payload.status === "alternative") {
      meal.alternativeTaken = payload.alternativeItems ?? [];
    }

    await plan.save();

    const existing = await DailyLogModel.findOne({
      userId: req.userId,
      date: payload.date,
      isDeleted: false,
    });

    const mealEntry: IMealLogEntry = {
      mealId: payload.mealId,
      planId: plan._id,
      status: payload.status,
      alternativeItems: payload.alternativeItems ?? [],
      loggedAt: new Date(),
      macrosConsumed,
    };

    const dailyLog =
      existing ??
      new DailyLogModel({
        userId: req.userId,
        date: payload.date,
        waterIntakeMl: 0,
        waterLogs: [],
        mealLogs: [],
        totalMacrosConsumed: zeroMacros(),
        macroCompliancePercent: 0,
        isDeleted: false,
      });

    const nextMealLogs = dailyLog.mealLogs.filter(
      (entry) => entry.mealId !== payload.mealId,
    );
    nextMealLogs.push(mealEntry);
    dailyLog.mealLogs = nextMealLogs;
    const savedDailyLog = await dailyLog.save();

    await MealLogModel.findOneAndUpdate(
      { userId: req.userId, mealId: payload.mealId },
      {
        $set: {
          userId: req.userId,
          date: payload.date,
          planId: plan._id,
          mealId: payload.mealId,
          mealLabel: meal.label,
          mealTimeSlot: meal.timeSlot,
          status: payload.status,
          alternativeItems: payload.alternativeItems ?? [],
          macrosConsumed,
          loggedAt: new Date(),
          isDeleted: false,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    const timezone = profile.location.timezone;
    const hour = Number(formatInTimeZone(new Date(), timezone, "H"));

    if (payload.status === "skipped" && hour >= 20) {
      const deficit = {
        protein: Math.max(
          0,
          profile.macros.protein - savedDailyLog.totalMacrosConsumed.protein,
        ),
        calories: Math.max(
          0,
          profile.macros.calories - savedDailyLog.totalMacrosConsumed.calories,
        ),
      };

      if (deficit.protein > 20 || deficit.calories > 400) {
        await sendMacroAlert(req.userId, deficit);
      }
    }

    if (savedDailyLog.macroCompliancePercent >= 100) {
      await updateStreak(req.userId, "diet");
    }
    await checkAndAwardDailyBadges(req.userId, savedDailyLog.toObject());

    await ActivityLogModel.create({
      userId: req.userId,
      action: "meal_logged",
      metadata: {
        mealId: payload.mealId,
        status: payload.status,
        macrosConsumed,
      },
      timestamp: new Date(),
    });

    const macroSummary = {
      consumed: savedDailyLog.totalMacrosConsumed,
      target: profile.macros,
      percentComplete: savedDailyLog.macroCompliancePercent,
      deficit: {
        protein: Math.max(
          0,
          profile.macros.protein - savedDailyLog.totalMacrosConsumed.protein,
        ),
        carbs: Math.max(
          0,
          profile.macros.carbs - savedDailyLog.totalMacrosConsumed.carbs,
        ),
        fat: Math.max(
          0,
          profile.macros.fat - savedDailyLog.totalMacrosConsumed.fat,
        ),
        calories: Math.max(
          0,
          profile.macros.calories - savedDailyLog.totalMacrosConsumed.calories,
        ),
      },
    };

    res.status(200).json({
      success: true,
      data: { dailyLog: savedDailyLog, macroSummary },
    });
  } catch (error) {
    next(error);
  }
};

export const skipMealWithAlternative: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    if (!req.userId) {
      throw new UnauthorisedError();
    }

    const payload = req.body as z.infer<typeof skipSchema>;
    const alternatives = await generateAlternatives(
      req.userId,
      payload.mealId,
      payload.date,
      payload.reason,
    );

    res.status(200).json({
      success: true,
      data: {
        alternatives,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getDailyLog: RequestHandler = async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new UnauthorisedError();
    }

    const date =
      typeof req.query.date === "string"
        ? req.query.date
        : new Date().toISOString().slice(0, 10);
    const profile = await getProfile(req.userId);
    const plan = await DietPlanModel.findOne({
      userId: req.userId,
      date,
      isDeleted: false,
    }).lean();

    const dailyLog = await DailyLogModel.findOne({
      userId: req.userId,
      date,
      isDeleted: false,
    }).lean();

    const resolvedDailyLog = dailyLog ?? createEmptyDailyLog(req.userId, date);
    const totalMeals = plan?.meals.length ?? 0;

    res.status(200).json({
      success: true,
      data: {
        dailyLog: resolvedDailyLog,
        macroSummary: {
          consumed: resolvedDailyLog.totalMacrosConsumed,
          target: profile.macros,
          percentComplete: resolvedDailyLog.macroCompliancePercent,
          deficit: {
            protein: Math.max(
              0,
              profile.macros.protein -
                resolvedDailyLog.totalMacrosConsumed.protein,
            ),
            carbs: Math.max(
              0,
              profile.macros.carbs - resolvedDailyLog.totalMacrosConsumed.carbs,
            ),
            fat: Math.max(
              0,
              profile.macros.fat - resolvedDailyLog.totalMacrosConsumed.fat,
            ),
            calories: Math.max(
              0,
              profile.macros.calories -
                resolvedDailyLog.totalMacrosConsumed.calories,
            ),
          },
        },
        waterSummary: await getWaterSummary(req.userId, resolvedDailyLog),
        mealComplianceSummary: getMealComplianceSummary(
          resolvedDailyLog,
          totalMeals,
        ),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getDailyStats: RequestHandler = async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new UnauthorisedError();
    }

    const date =
      typeof req.query.date === "string"
        ? req.query.date
        : new Date().toISOString().slice(0, 10);
    const profile = await getProfile(req.userId);
    const plan = await DietPlanModel.findOne({
      userId: req.userId,
      date,
      isDeleted: false,
    }).lean();

    const dailyLog =
      (await DailyLogModel.findOne({
        userId: req.userId,
        date,
        isDeleted: false,
      }).lean()) ?? createEmptyDailyLog(req.userId, date);

    const streaks = await getAllStreaks(req.userId);

    res.status(200).json({
      success: true,
      data: {
        macros: {
          consumed: dailyLog.totalMacrosConsumed,
          target: profile.macros,
          percent: dailyLog.macroCompliancePercent,
        },
        water: await getWaterSummary(req.userId, dailyLog),
        meals: getMealComplianceSummary(dailyLog, plan?.meals.length ?? 0),
        energy: dailyLog.energyLevel ?? null,
        sleep: dailyLog.sleepQuality
          ? { quality: dailyLog.sleepQuality, hours: dailyLog.hoursSlept ?? 0 }
          : null,
        streakUpdates: streaks.filter(Boolean).map((streak) => ({
          type: streak?.type ?? "diet",
          current: streak?.currentStreak ?? 0,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};
