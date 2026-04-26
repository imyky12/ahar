import type { RequestHandler } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import {
  CHRONIC_CONDITIONS,
  CHRONIC_CONDITION_LABELS,
} from "../constants/chronicConditions";

import { ActivityLogModel } from "../models/ActivityLog";
import { BadgeModel } from "../services/badgeService";
import { DailyLogModel } from "../models/DailyLog";
import { DietPlanModel } from "../models/DietPlan";
import { GymLogModel } from "../models/GymLog";
import { NotificationModel } from "../models/Notification";
import { StreakModel } from "../models/Streak";
import { UserModel } from "../models/User";
import { UserProfileModel, type IUserProfile } from "../models/UserProfile";
import { uploadProfileImageToCloudinary } from "../services/cloudinaryService";
import { WeeklyCheckinModel } from "../models/WeeklyCheckin";
import { WeightLogModel } from "../models/WeightLog";
import { getUpcomingFestivals } from "../services/festivalService";
import { AuthError } from "../utils/jwt";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorisedError,
} from "../utils/errors";

const HHMM_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

const fastingWindowSchema = z.object({
  start: z.string().regex(HHMM_PATTERN, "Invalid fasting start time"),
  end: z.string().regex(HHMM_PATTERN, "Invalid fasting end time"),
});

const scheduleSchema = z.object({
  wakeTime: z.string().regex(HHMM_PATTERN, "Invalid wake time"),
  sleepTime: z.string().regex(HHMM_PATTERN, "Invalid sleep time"),
  officeStart: z
    .string()
    .regex(HHMM_PATTERN, "Invalid office start time")
    .optional(),
  officeEnd: z
    .string()
    .regex(HHMM_PATTERN, "Invalid office end time")
    .optional(),
  gymStart: z.string().regex(HHMM_PATTERN, "Invalid gym start time").optional(),
  gymEnd: z.string().regex(HHMM_PATTERN, "Invalid gym end time").optional(),
});

export const profileCreateSchema = z.object({
  avatarUrl: z.string().url().optional(),
  name: z.string().min(2).max(50),
  age: z.number().int().min(13).max(100),
  gender: z.enum(["male", "female", "other"]),
  weight: z.number().min(30).max(300),
  height: z.number().min(100).max(250),
  activityType: z.enum(["gym", "home", "run", "walk", "desk", "yoga"]),
  gymTime: z.enum(["morning", "evening", "none"]),
  goal: z.enum(["lose", "gain", "maintain"]),
  dietPref: z.object({
    isVeg: z.boolean(),
    allergies: z.array(z.string()),
    chronicConditions: z.array(z.enum(CHRONIC_CONDITIONS)).optional(),
    fastingWindow: fastingWindowSchema.optional(),
  }),
  schedule: scheduleSchema,
  location: z.object({
    country: z.string().min(1),
    timezone: z.string().min(1),
    city: z.string().optional(),
  }),
  female: z
    .object({
      trackCycle: z.boolean(),
      lastPeriodDate: z.coerce.date().optional(),
      cycleLength: z.number().int().min(21).max(35).optional(),
    })
    .optional(),
});

export const profileUpdateSchema = profileCreateSchema.partial();

export const uploadAvatarSchema = z.object({
  dataUri: z
    .string()
    .min(30)
    .regex(/^data:image\/(jpeg|jpg|png|webp);base64,/, "Invalid image data"),
});

export const deleteAccountSchema = z.object({
  confirmEmail: z.string().email(),
  password: z.string().min(1),
});

type ProfileCreateInput = z.infer<typeof profileCreateSchema>;
type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

const ACTIVITY_MULTIPLIER: Record<ProfileCreateInput["activityType"], number> =
  {
    desk: 1.2,
    walk: 1.375,
    yoga: 1.45,
    home: 1.5,
    gym: 1.55,
    run: 1.7,
  };

const calculateTDEE = (
  profile: Pick<
    ProfileCreateInput,
    "gender" | "weight" | "height" | "age" | "activityType"
  >,
): number => {
  const base =
    profile.gender === "male"
      ? 10 * profile.weight + 6.25 * profile.height - 5 * profile.age + 5
      : profile.gender === "female"
        ? 10 * profile.weight + 6.25 * profile.height - 5 * profile.age - 161
        : 10 * profile.weight + 6.25 * profile.height - 5 * profile.age - 78;

  const multiplier = ACTIVITY_MULTIPLIER[profile.activityType] ?? 1.2;
  return Math.round(base * multiplier);
};

const calculateHydration = (
  weightKg: number,
  activityType: ProfileCreateInput["activityType"],
): number => {
  const baselineMl = weightKg * 35;
  const activeTypes = new Set<ProfileCreateInput["activityType"]>([
    "gym",
    "run",
    "home",
    "yoga",
  ]);
  const activityBonusMl = activeTypes.has(activityType) ? 500 : 250;

  return Math.round(baselineMl + activityBonusMl);
};

const calculateMacros = (
  tdee: number,
  goal: ProfileCreateInput["goal"],
): IUserProfile["macros"] => {
  const adjustedCalories =
    goal === "lose" ? tdee - 400 : goal === "gain" ? tdee + 300 : tdee;
  const safeCalories = Math.max(adjustedCalories, 1200);

  const ratios =
    goal === "lose"
      ? { protein: 0.35, carbs: 0.35, fat: 0.3 }
      : goal === "gain"
        ? { protein: 0.3, carbs: 0.45, fat: 0.25 }
        : { protein: 0.3, carbs: 0.4, fat: 0.3 };

  return {
    protein: Math.round((safeCalories * ratios.protein) / 4),
    carbs: Math.round((safeCalories * ratios.carbs) / 4),
    fat: Math.round((safeCalories * ratios.fat) / 9),
    calories: safeCalories,
  };
};

const getRequestMetadata = (req: Parameters<RequestHandler>[0]) => ({
  ipAddress: req.ip,
  userAgent: req.get("user-agent") ?? undefined,
});

const changedFields = (payload: ProfileUpdateInput): string[] => {
  return Object.keys(payload).filter(
    (key) => payload[key as keyof ProfileUpdateInput] !== undefined,
  );
};

export const createProfile: RequestHandler = async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new AuthError("Unauthorized", "UNAUTHORIZED");
    }

    const payload = req.body as ProfileCreateInput;

    const existingProfile = await UserProfileModel.findOne({
      userId: req.userId,
    }).lean();
    if (existingProfile) {
      throw new ConflictError("Profile already exists");
    }

    const tdee = calculateTDEE(payload);
    const hydrationGoalMl = calculateHydration(
      payload.weight,
      payload.activityType,
    );
    const macros = calculateMacros(tdee, payload.goal);

    const profile = await UserProfileModel.create({
      userId: req.userId,
      ...payload,
      tdee,
      hydrationGoalMl,
      macros,
      isOnboardingComplete: true,
      onboardingCompletedAt: new Date(),
    });

    await ActivityLogModel.create({
      userId: req.userId,
      action: "onboarding_complete",
      metadata: { profileId: profile._id.toString() },
      ...getRequestMetadata(req),
      timestamp: new Date(),
    });

    res.status(201).json({ success: true, data: { profile } });
  } catch (error) {
    next(error);
  }
};

export const getProfile: RequestHandler = async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new AuthError("Unauthorized", "UNAUTHORIZED");
    }

    const profile = await UserProfileModel.findOne({
      userId: req.userId,
    }).lean();

    if (!profile) {
      throw new NotFoundError("Profile not found");
    }

    res.status(200).json({ success: true, data: { profile } });
  } catch (error) {
    next(error);
  }
};

export const updateProfile: RequestHandler = async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new AuthError("Unauthorized", "UNAUTHORIZED");
    }

    const payload = req.body as ProfileUpdateInput;
    const profile = await UserProfileModel.findOne({ userId: req.userId });

    if (!profile) {
      throw new NotFoundError("Profile not found");
    }

    const keys = changedFields(payload);

    for (const key of keys) {
      profile.set(key, payload[key as keyof ProfileUpdateInput]);
    }

    const shouldRecalculate =
      payload.weight !== undefined ||
      payload.height !== undefined ||
      payload.age !== undefined ||
      payload.gender !== undefined ||
      payload.activityType !== undefined ||
      payload.goal !== undefined;

    if (shouldRecalculate) {
      const tdee = calculateTDEE({
        gender: profile.gender,
        weight: profile.weight,
        height: profile.height,
        age: profile.age,
        activityType: profile.activityType,
      });

      profile.tdee = tdee;
      profile.hydrationGoalMl = calculateHydration(
        profile.weight,
        profile.activityType,
      );
      profile.macros = calculateMacros(tdee, profile.goal);
    }

    await profile.save();

    await ActivityLogModel.create({
      userId: req.userId,
      action: "profile_updated",
      metadata: { changedFields: keys },
      ...getRequestMetadata(req),
      timestamp: new Date(),
    });

    res.status(200).json({ success: true, data: { profile } });
  } catch (error) {
    next(error);
  }
};

export const uploadAvatar: RequestHandler = async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new AuthError("Unauthorized", "UNAUTHORIZED");
    }

    const payload = req.body as z.infer<typeof uploadAvatarSchema>;

    const profile = await UserProfileModel.findOne({ userId: req.userId });
    if (!profile) {
      throw new NotFoundError("Profile not found");
    }

    const avatarUrl = await uploadProfileImageToCloudinary(payload.dataUri);
    profile.avatarUrl = avatarUrl;
    await profile.save();

    await ActivityLogModel.create({
      userId: req.userId,
      action: "profile_avatar_updated",
      metadata: { avatarUrl },
      ...getRequestMetadata(req),
      timestamp: new Date(),
    });

    res.status(200).json({
      success: true,
      data: {
        avatarUrl,
        profile,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAccount: RequestHandler = async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new AuthError("Unauthorized", "UNAUTHORIZED");
    }

    const payload = req.body as z.infer<typeof deleteAccountSchema>;
    const user = await UserModel.findById(req.userId);

    if (!user || user.isDeleted) {
      throw new NotFoundError("User not found");
    }

    if (user.email.toLowerCase() !== payload.confirmEmail.toLowerCase()) {
      throw new BadRequestError("Email confirmation mismatch");
    }

    const matched = await bcrypt.compare(payload.password, user.passwordHash);
    if (!matched) {
      throw new UnauthorisedError("Invalid credentials");
    }

    await Promise.all([
      UserModel.updateOne({ _id: req.userId }, { $set: { isDeleted: true } }),
      UserProfileModel.updateOne(
        { userId: req.userId },
        { $set: { isDeleted: true } },
      ),
      DietPlanModel.updateMany(
        { userId: req.userId },
        { $set: { isDeleted: true } },
      ),
      DailyLogModel.updateMany(
        { userId: req.userId },
        { $set: { isDeleted: true } },
      ),
      GymLogModel.updateMany(
        { userId: req.userId },
        { $set: { isDeleted: true } },
      ),
      NotificationModel.updateMany(
        { userId: req.userId },
        { $set: { isDeleted: true } },
      ),
      WeightLogModel.updateMany(
        { userId: req.userId },
        { $set: { isDeleted: true } },
      ),
      WeeklyCheckinModel.updateMany(
        { userId: req.userId },
        { $set: { isDeleted: true } },
      ),
    ]);

    await ActivityLogModel.create({
      userId: req.userId,
      action: "account_deleted",
      metadata: {},
      ...getRequestMetadata(req),
      timestamp: new Date(),
    });

    res
      .status(200)
      .json({ success: true, data: { message: "Account deleted" } });
  } catch (error) {
    next(error);
  }
};

export const getUpcomingFestivalsController: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    if (!req.userId) {
      throw new AuthError("Unauthorized", "UNAUTHORIZED");
    }

    const profile = await UserProfileModel.findOne({
      userId: req.userId,
      isDeleted: { $ne: true },
    }).lean();

    if (!profile) {
      throw new NotFoundError("Profile not found");
    }

    const festivals = await getUpcomingFestivals(profile.location.country, 14);
    res.status(200).json({ success: true, data: { festivals } });
  } catch (error) {
    next(error);
  }
};

export const getChronicConditionsController: RequestHandler = async (
  _req,
  res,
) => {
  res.status(200).json({
    success: true,
    data: {
      conditions: CHRONIC_CONDITIONS.map((code) => ({
        code,
        label: CHRONIC_CONDITION_LABELS[code],
      })),
    },
  });
};

export const exportUserData: RequestHandler = async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new AuthError("Unauthorized", "UNAUTHORIZED");
    }

    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const [
      profile,
      allDietPlans,
      allDailyLogs,
      allGymLogs,
      allWeightLogs,
      allWeeklySummaries,
      streaks,
      badges,
    ] = await Promise.all([
      UserProfileModel.findOne({
        userId: req.userId,
        isDeleted: { $ne: true },
      }).lean(),
      DietPlanModel.find({
        userId: req.userId,
        date: { $gte: ninetyDaysAgo },
        isDeleted: false,
      })
        .sort({ date: -1 })
        .lean(),
      DailyLogModel.find({
        userId: req.userId,
        date: { $gte: ninetyDaysAgo },
        isDeleted: false,
      })
        .sort({ date: -1 })
        .lean(),
      GymLogModel.find({ userId: req.userId, isDeleted: false })
        .sort({ date: -1 })
        .lean(),
      WeightLogModel.find({ userId: req.userId, isDeleted: false })
        .sort({ date: -1 })
        .lean(),
      WeeklyCheckinModel.find({ userId: req.userId, isDeleted: false })
        .sort({ weekStart: -1 })
        .lean(),
      StreakModel.find({ userId: req.userId, isDeleted: false }).lean(),
      BadgeModel.find({ userId: req.userId, isDeleted: false }).lean(),
    ]);

    const dataExport = {
      profile,
      allDietPlans,
      allDailyLogs,
      allGymLogs,
      allWeightLogs,
      allWeeklySummaries,
      streaks,
      badges,
      generatedAt: new Date().toISOString(),
    };

    await ActivityLogModel.create({
      userId: req.userId,
      action: "data_exported",
      metadata: { sections: Object.keys(dataExport) },
      ...getRequestMetadata(req),
      timestamp: new Date(),
    });

    res.status(200).json({ success: true, data: { export: dataExport } });
  } catch (error) {
    next(error);
  }
};
