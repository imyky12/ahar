import { addDays } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import type { RequestHandler } from "express";
import { z } from "zod";

import { ActivityLogModel } from "../models/ActivityLog";
import { DietPlanModel } from "../models/DietPlan";
import {
  BadRequestError,
  InternalError,
  NotFoundError,
  RateLimitError,
  UnauthorisedError,
} from "../utils/errors";
import { GroceryListModel } from "../models/GroceryList";
import { PrepTaskModel } from "../models/PrepTask";
import { UserProfileModel } from "../models/UserProfile";
import { generateAlternatives, generateDietPlan } from "../services/aiService";
import { triggerManualPlanGeneration } from "../services/planScheduler";

export const updatePrepTaskSchema = z.object({
  taskId: z.string().min(1),
  isDone: z.boolean(),
});

export const alternativesSchema = z.object({
  mealId: z.string().min(1),
  planDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.enum(["not_available", "not_eaten", "disliked"]),
});

const getTimezoneForUser = async (userId: string): Promise<string> => {
  const profile = await UserProfileModel.findOne({
    userId,
    isDeleted: { $ne: true },
  }).lean();
  if (!profile?.location.timezone) {
    return "Asia/Kolkata";
  }

  return profile.location.timezone;
};

const getPlanResponse = async (userId: string, date: string) => {
  const plan = await DietPlanModel.findOne({
    userId,
    date,
    isDeleted: false,
  }).lean();
  if (!plan) {
    return null;
  }

  const [prepTasks, groceryList] = await Promise.all([
    PrepTaskModel.find({ userId, date, isDeleted: false }).lean(),
    GroceryListModel.findOne({ userId, date, isDeleted: false }).lean(),
  ]);

  return {
    plan,
    prepTasks,
    groceryList: groceryList?.items ?? [],
  };
};

export const getTodaysPlan: RequestHandler = async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new UnauthorisedError();
    }

    const timezone = await getTimezoneForUser(req.userId);
    const todayDate = formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");

    let payload = await getPlanResponse(req.userId, todayDate);

    if (!payload) {
      await generateDietPlan(req.userId, todayDate);
      payload = await getPlanResponse(req.userId, todayDate);
    }

    if (!payload) {
      throw new InternalError("Could not generate plan");
    }

    res.status(200).json({ success: true, data: payload });
  } catch (error) {
    next(error);
  }
};

export const getTomorrowsPlan: RequestHandler = async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new UnauthorisedError();
    }

    const timezone = await getTimezoneForUser(req.userId);
    const tomorrowDate = formatInTimeZone(
      addDays(new Date(), 1),
      timezone,
      "yyyy-MM-dd",
    );

    let payload = await getPlanResponse(req.userId, tomorrowDate);

    if (!payload) {
      await generateDietPlan(req.userId, tomorrowDate);
      payload = await getPlanResponse(req.userId, tomorrowDate);
    }

    if (!payload) {
      throw new InternalError("Could not generate plan");
    }

    res.status(200).json({ success: true, data: payload });
  } catch (error) {
    next(error);
  }
};

export const getPlanByDate: RequestHandler = async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new UnauthorisedError();
    }

    const dateParam = req.params.date;
    const date = Array.isArray(dateParam) ? dateParam[0] : dateParam;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestError("Invalid date format");
    }

    const payload = await getPlanResponse(req.userId, date);

    if (!payload) {
      throw new NotFoundError("Plan not found");
    }

    res.status(200).json({ success: true, data: payload });
  } catch (error) {
    next(error);
  }
};

export const triggerManualGeneration: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    if (!req.userId) {
      throw new UnauthorisedError();
    }

    const timezone = await getTimezoneForUser(req.userId);
    const todayDate = formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");

    const startsAt = new Date(`${todayDate}T00:00:00.000Z`);
    const endsAt = new Date(`${todayDate}T23:59:59.999Z`);

    const triggerCount = await ActivityLogModel.countDocuments({
      userId: req.userId,
      action: "manual_plan_triggered",
      timestamp: { $gte: startsAt, $lte: endsAt },
    });

    if (triggerCount >= 3) {
      throw new RateLimitError("Manual limit reached (3/day)");
    }

    const plan = await triggerManualPlanGeneration(req.userId);

    await ActivityLogModel.create({
      userId: req.userId,
      action: "manual_plan_triggered",
      metadata: {
        date: plan.date,
        planType: plan.planType,
      },
      timestamp: new Date(),
    });

    res.status(201).json({ success: true, data: { plan } });
  } catch (error) {
    next(error);
  }
};

export const updatePrepTask: RequestHandler = async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new UnauthorisedError();
    }

    const payload = req.body as z.infer<typeof updatePrepTaskSchema>;

    const task = await PrepTaskModel.findOneAndUpdate(
      {
        userId: req.userId,
        id: payload.taskId,
        isDeleted: false,
      },
      {
        $set: {
          isDone: payload.isDone,
        },
      },
      { new: true },
    ).lean();

    if (!task) {
      throw new NotFoundError("Task not found");
    }

    await ActivityLogModel.create({
      userId: req.userId,
      action: "prep_task_updated",
      metadata: {
        taskId: payload.taskId,
        isDone: payload.isDone,
      },
      timestamp: new Date(),
    });

    res.status(200).json({ success: true, data: { task } });
  } catch (error) {
    next(error);
  }
};

export const getAlternatives: RequestHandler = async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new UnauthorisedError();
    }

    const payload = req.body as z.infer<typeof alternativesSchema>;
    const alternatives = await generateAlternatives(
      req.userId,
      payload.mealId,
      payload.planDate,
      payload.reason,
    );

    res.status(200).json({ success: true, data: { alternatives } });
  } catch (error) {
    next(error);
  }
};
