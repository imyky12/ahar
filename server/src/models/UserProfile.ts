import { Schema, model, type HydratedDocument } from "mongoose";
import {
  CHRONIC_CONDITIONS,
  type ChronicCondition,
} from "../constants/chronicConditions";

type Gender = "male" | "female" | "other";
type ActivityType = "gym" | "home" | "run" | "walk" | "desk" | "yoga";
type GymTime = "morning" | "evening" | "none";
type Goal = "lose" | "gain" | "maintain";

interface IFastingWindow {
  start: string;
  end: string;
}

interface IDietPreferences {
  isVeg: boolean;
  allergies: string[];
  chronicConditions?: ChronicCondition[];
  cuisinePreferences?: string[];
  foodsToAvoid?: string[];
  fastingWindow?: IFastingWindow;
}

interface ISchedule {
  wakeTime: string;
  sleepTime: string;
  officeStart?: string;
  officeEnd?: string;
  gymStart?: string;
  gymEnd?: string;
}

interface ILocation {
  country: string;
  timezone: string;
  city?: string;
}

interface IFemaleProfile {
  trackCycle: boolean;
  lastPeriodDate?: Date;
  cycleLength?: number;
}

interface IMacros {
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
}

export interface IUserProfile {
  userId: string;
  avatarUrl?: string;
  name: string;
  age: number;
  gender: Gender;
  weight: number;
  height: number;
  activityType: ActivityType;
  gymTime: GymTime;
  goal: Goal;
  dietPref: IDietPreferences;
  schedule: ISchedule;
  location: ILocation;
  female?: IFemaleProfile;
  tdee: number;
  hydrationGoalMl: number;
  macros: IMacros;
  onboardingCompletedAt?: Date;
  isOnboardingComplete: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ACTIVITY_MULTIPLIER: Record<ActivityType, number> = {
  desk: 1.2,
  walk: 1.375,
  yoga: 1.45,
  home: 1.5,
  gym: 1.55,
  run: 1.7,
};

const calculateTDEE = (
  profile: Pick<
    IUserProfile,
    "gender" | "weight" | "height" | "age" | "activityType"
  >,
): number => {
  const base =
    profile.gender === "male"
      ? 10 * profile.weight + 6.25 * profile.height - 5 * profile.age + 5
      : profile.gender === "female"
        ? 10 * profile.weight + 6.25 * profile.height - 5 * profile.age - 161
        : 10 * profile.weight + 6.25 * profile.height - 5 * profile.age - 78;

  const activityMultiplier = ACTIVITY_MULTIPLIER[profile.activityType] ?? 1.2;
  return Math.round(base * activityMultiplier);
};

const calculateMacros = (tdee: number, goal: Goal): IMacros => {
  const adjustedCalories =
    goal === "lose" ? tdee - 400 : goal === "gain" ? tdee + 300 : tdee;

  const safeCalories = Math.max(adjustedCalories, 1200);

  const ratios =
    goal === "lose"
      ? { protein: 0.35, carbs: 0.35, fat: 0.3 }
      : goal === "gain"
        ? { protein: 0.3, carbs: 0.45, fat: 0.25 }
        : { protein: 0.3, carbs: 0.4, fat: 0.3 };

  const protein = Math.round((safeCalories * ratios.protein) / 4);
  const carbs = Math.round((safeCalories * ratios.carbs) / 4);
  const fat = Math.round((safeCalories * ratios.fat) / 9);

  return {
    protein,
    carbs,
    fat,
    calories: safeCalories,
  };
};

const calculateHydration = (
  weightKg: number,
  activityType: ActivityType,
): number => {
  const baselineMl = weightKg * 35;
  const activeTypes = new Set<ActivityType>(["gym", "run", "home", "yoga"]);
  const activityBonusMl = activeTypes.has(activityType) ? 500 : 250;

  return Math.round(baselineMl + activityBonusMl);
};

const userProfileSchema = new Schema<IUserProfile>(
  {
    userId: { type: String, required: true },
    avatarUrl: { type: String, required: false },
    name: { type: String, required: true },
    age: { type: Number, required: true },
    gender: { type: String, enum: ["male", "female", "other"], required: true },
    weight: { type: Number, required: true },
    height: { type: Number, required: true },
    activityType: {
      type: String,
      enum: ["gym", "home", "run", "walk", "desk", "yoga"],
      required: true,
    },
    gymTime: {
      type: String,
      enum: ["morning", "evening", "none"],
      required: true,
    },
    goal: { type: String, enum: ["lose", "gain", "maintain"], required: true },
    dietPref: {
      isVeg: { type: Boolean, required: true },
      allergies: { type: [String], required: true },
      chronicConditions: {
        type: [String],
        enum: [...CHRONIC_CONDITIONS],
        required: false,
        default: [],
      },
      cuisinePreferences: { type: [String], required: false, default: [] },
      foodsToAvoid: { type: [String], required: false, default: [] },
      fastingWindow: {
        start: { type: String, required: false },
        end: { type: String, required: false },
      },
    },
    schedule: {
      wakeTime: { type: String, required: true },
      sleepTime: { type: String, required: true },
      officeStart: { type: String, required: false },
      officeEnd: { type: String, required: false },
      gymStart: { type: String, required: false },
      gymEnd: { type: String, required: false },
    },
    location: {
      country: { type: String, required: true },
      timezone: { type: String, required: true },
      city: { type: String, required: false },
    },
    female: {
      trackCycle: { type: Boolean, required: false },
      lastPeriodDate: { type: Date, required: false },
      cycleLength: { type: Number, required: false },
    },
    tdee: { type: Number, required: true },
    hydrationGoalMl: { type: Number, required: true },
    macros: {
      protein: { type: Number, required: true },
      carbs: { type: Number, required: true },
      fat: { type: Number, required: true },
      calories: { type: Number, required: true },
    },
    onboardingCompletedAt: { type: Date, required: false },
    isOnboardingComplete: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
);

userProfileSchema.index({ userId: 1 }, { unique: true });
userProfileSchema.index({ "location.timezone": 1, isDeleted: 1 });

userProfileSchema.pre("save", function preSave(next) {
  try {
    const doc = this as HydratedDocument<IUserProfile>;

    const shouldRecalculate =
      doc.isNew ||
      doc.isModified("weight") ||
      doc.isModified("height") ||
      doc.isModified("age") ||
      doc.isModified("gender") ||
      doc.isModified("activityType") ||
      doc.isModified("goal");

    if (shouldRecalculate) {
      doc.tdee = calculateTDEE({
        gender: doc.gender,
        weight: doc.weight,
        height: doc.height,
        age: doc.age,
        activityType: doc.activityType,
      });
      doc.hydrationGoalMl = calculateHydration(doc.weight, doc.activityType);
      doc.macros = calculateMacros(doc.tdee, doc.goal);
    }

    if (
      doc.isModified("isOnboardingComplete") &&
      doc.isOnboardingComplete &&
      !doc.onboardingCompletedAt
    ) {
      doc.onboardingCompletedAt = new Date();
    }

    next();
  } catch (error) {
    next(error as Error);
  }
});

export const UserProfileModel = model<IUserProfile>(
  "UserProfile",
  userProfileSchema,
);
