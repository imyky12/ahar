import { Schema, model, type Types } from "mongoose";

import { DailyLogModel, type IDailyLog } from "../models/DailyLog";
import { DietPlanModel } from "../models/DietPlan";
import { UserProfileModel } from "../models/UserProfile";
import { logger } from "../utils/logger";
import {
  sendImmediateNotification,
  type ImmediateNotificationParams,
} from "./notificationService";

export const BADGE_DEFINITIONS = {
  first_plan: {
    label: "First Plan",
    icon: "nutrition",
    desc: "Generated your first diet plan",
  },
  "7_day_streak": {
    label: "Week Warrior",
    icon: "flame",
    desc: "7-day diet streak",
  },
  "14_day_streak": {
    label: "Two Week Beast",
    icon: "trophy",
    desc: "14-day diet streak",
  },
  "30_day_streak": {
    label: "Monthly Master",
    icon: "medal",
    desc: "30-day diet streak",
  },
  gym_week: {
    label: "Gym Week",
    icon: "barbell",
    desc: "Logged gym 5 days in a week",
  },
  hydration_hero: {
    label: "Hydration Hero",
    icon: "water",
    desc: "Hit water goal 7 days in a row",
  },
  early_bird: {
    label: "Early Bird",
    icon: "sunny",
    desc: "Logged breakfast before 9am, 5 days running",
  },
  plan_finisher: {
    label: "Clean Plate",
    icon: "checkmark-circle",
    desc: "Completed all meals in a day",
  },
} as const;

export type BadgeId = keyof typeof BADGE_DEFINITIONS;

interface IBadge {
  _id?: Types.ObjectId;
  userId: string;
  badgeId: BadgeId | string;
  earnedAt: Date;
  isNew: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const badgeSchema = new Schema<IBadge>(
  {
    userId: { type: String, required: true, index: true },
    badgeId: { type: String, required: true },
    earnedAt: { type: Date, required: true, default: () => new Date() },
    isNew: { type: Boolean, default: true, required: true },
    isDeleted: { type: Boolean, default: false, required: true },
  },
  {
    timestamps: true,
  },
);

badgeSchema.index({ userId: 1, badgeId: 1 }, { unique: true });

export const BadgeModel = model<IBadge>("Badge", badgeSchema);

const sendBadgeNotification = async (
  userId: string,
  badgeId: BadgeId,
): Promise<void> => {
  const definition = BADGE_DEFINITIONS[badgeId];
  const payload: ImmediateNotificationParams = {
    userId,
    type: "streak_milestone",
    title: `${definition.label} unlocked! 🏅`,
    body: definition.desc,
    data: { screen: "dashboard", action: "badge", badgeId },
    sound: "chime",
    priority: "high",
  };

  await sendImmediateNotification(payload);
};

export const awardBadge = async (
  userId: string,
  badgeId: BadgeId | string,
): Promise<void> => {
  try {
    const exists = await BadgeModel.findOne({ userId, badgeId }).lean();
    if (exists) {
      return;
    }

    await BadgeModel.create({
      userId,
      badgeId,
      earnedAt: new Date(),
      isNew: true,
      isDeleted: false,
    });

    if (badgeId in BADGE_DEFINITIONS) {
      await sendBadgeNotification(userId, badgeId as BadgeId);
    }
  } catch (error) {
    logger.warn(`awardBadge failed for user=${userId}: ${String(error)}`);
  }
};

export const getUserBadges = async (
  userId: string,
): Promise<Array<IBadge & { label: string; icon: string; desc: string }>> => {
  const badges = await BadgeModel.find({ userId, isDeleted: false })
    .sort({ earnedAt: -1 })
    .lean();

  return badges.map((badge) => {
    const definition =
      BADGE_DEFINITIONS[badge.badgeId as BadgeId] ??
      ({ label: badge.badgeId, icon: "ribbon", desc: "Badge earned" } as const);

    return {
      ...badge,
      label: definition.label,
      icon: definition.icon,
      desc: definition.desc,
    };
  });
};

export const markUserBadgesSeen = async (userId: string): Promise<number> => {
  const result = await BadgeModel.updateMany(
    { userId, isDeleted: false, isNew: true },
    { $set: { isNew: false } },
  );

  return result.modifiedCount;
};

const hasReachedPlanFinisher = async (
  userId: string,
  dailyLog: IDailyLog,
): Promise<boolean> => {
  const plan = await DietPlanModel.findOne({
    userId,
    date: dailyLog.date,
    isDeleted: false,
  }).lean();

  if (!plan || !plan.meals.length) {
    return false;
  }

  const doneMealIds = new Set(
    dailyLog.mealLogs
      .filter((entry) => entry.status === "done")
      .map((entry) => entry.mealId),
  );

  return plan.meals.every((meal) => doneMealIds.has(meal.id));
};

const hasReachedHydrationHero = async (userId: string): Promise<boolean> => {
  const profile = await UserProfileModel.findOne({
    userId,
    isDeleted: { $ne: true },
  }).lean();

  if (!profile) {
    return false;
  }

  const recentDays = await DailyLogModel.find({
    userId,
    isDeleted: false,
  })
    .sort({ date: -1 })
    .limit(7)
    .lean();

  if (recentDays.length < 7) {
    return false;
  }

  return recentDays.every(
    (entry) => entry.waterIntakeMl >= profile.hydrationGoalMl,
  );
};

const hasReachedEarlyBird = async (userId: string): Promise<boolean> => {
  const recentDays = await DailyLogModel.find({
    userId,
    isDeleted: false,
  })
    .sort({ date: -1 })
    .limit(5)
    .lean();

  if (recentDays.length < 5) {
    return false;
  }

  return recentDays.every((entry) => {
    return entry.mealLogs.some((mealLog) => {
      const hours = mealLog.loggedAt.getHours();
      return hours < 9 && mealLog.status === "done";
    });
  });
};

export const checkAndAwardDailyBadges = async (
  userId: string,
  dailyLog: IDailyLog,
): Promise<void> => {
  try {
    if (await hasReachedPlanFinisher(userId, dailyLog)) {
      await awardBadge(userId, "plan_finisher");
    }

    if (await hasReachedHydrationHero(userId)) {
      await awardBadge(userId, "hydration_hero");
    }

    if (await hasReachedEarlyBird(userId)) {
      await awardBadge(userId, "early_bird");
    }
  } catch (error) {
    logger.warn(
      `checkAndAwardDailyBadges failed for user=${userId}: ${String(error)}`,
    );
  }
};
