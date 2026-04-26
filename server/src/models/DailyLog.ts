import { Schema, model, type HydratedDocument, type Types } from "mongoose";

import { UserProfileModel } from "./UserProfile";
import type { IFoodItem, IMacros } from "./DietPlan";

export interface IWaterLogEntry {
  amount: number;
  loggedAt: Date;
}

export interface IMealLogEntry {
  mealId: string;
  planId: Types.ObjectId;
  status: "done" | "skipped" | "alternative";
  alternativeItems: IFoodItem[];
  loggedAt: Date;
  macrosConsumed: IMacros;
}

export interface IDailyLog {
  _id?: Types.ObjectId;
  userId: string;
  date: string;
  energyLevel?: number;
  sleepQuality?: number;
  hoursSlept?: number;
  waterIntakeMl: number;
  waterLogs: IWaterLogEntry[];
  mealLogs: IMealLogEntry[];
  totalMacrosConsumed: IMacros;
  macroCompliancePercent: number;
  notes?: string;
  temporaryCondition?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const macrosSchema = new Schema<IMacros>(
  {
    protein: { type: Number, default: 0, required: true },
    carbs: { type: Number, default: 0, required: true },
    fat: { type: Number, default: 0, required: true },
    calories: { type: Number, default: 0, required: true },
  },
  { _id: false },
);

const waterLogSchema = new Schema<IWaterLogEntry>(
  {
    amount: { type: Number, required: true },
    loggedAt: { type: Date, required: true, default: () => new Date() },
  },
  { _id: false },
);

const foodItemSchema = new Schema<IFoodItem>(
  {
    name: { type: String, required: true },
    quantity: { type: String, required: true },
    unit: { type: String, required: true },
    macros: { type: macrosSchema, required: true },
    cookTimeMinutes: { type: Number, required: true },
  },
  { _id: false },
);

const mealLogSchema = new Schema<IMealLogEntry>(
  {
    mealId: { type: String, required: true },
    planId: { type: Schema.Types.ObjectId, ref: "DietPlan", required: true },
    status: {
      type: String,
      enum: ["done", "skipped", "alternative"],
      required: true,
    },
    alternativeItems: { type: [foodItemSchema], default: [] },
    loggedAt: { type: Date, required: true, default: () => new Date() },
    macrosConsumed: { type: macrosSchema, required: true },
  },
  { _id: false },
);

const dailyLogSchema = new Schema<IDailyLog>(
  {
    userId: { type: String, required: true, index: true },
    date: { type: String, required: true },
    energyLevel: { type: Number, required: false },
    sleepQuality: { type: Number, required: false },
    hoursSlept: { type: Number, required: false },
    waterIntakeMl: { type: Number, default: 0, required: true },
    waterLogs: { type: [waterLogSchema], default: [] },
    mealLogs: { type: [mealLogSchema], default: [] },
    totalMacrosConsumed: {
      type: macrosSchema,
      default: () => ({ protein: 0, carbs: 0, fat: 0, calories: 0 }),
      required: true,
    },
    macroCompliancePercent: { type: Number, default: 0, required: true },
    notes: { type: String, required: false },
    temporaryCondition: { type: String, required: false },
    isDeleted: { type: Boolean, default: false, required: true },
  },
  {
    timestamps: true,
  },
);

dailyLogSchema.index({ userId: 1, date: 1 }, { unique: true });

const sumMacros = (mealLogs: IMealLogEntry[]): IMacros => {
  return mealLogs
    .filter((entry) => entry.status !== "skipped")
    .reduce<IMacros>(
      (acc, entry) => ({
        protein: acc.protein + (entry.macrosConsumed.protein ?? 0),
        carbs: acc.carbs + (entry.macrosConsumed.carbs ?? 0),
        fat: acc.fat + (entry.macrosConsumed.fat ?? 0),
        calories: acc.calories + (entry.macrosConsumed.calories ?? 0),
      }),
      { protein: 0, carbs: 0, fat: 0, calories: 0 },
    );
};

const calculateCompliance = async (
  userId: string,
  macrosConsumed: IMacros,
): Promise<number | null> => {
  const profile = await UserProfileModel.findOne({
    userId,
    isDeleted: { $ne: true },
  }).lean();

  if (!profile) {
    return null;
  }

  const target = profile.macros;
  const ratios = [
    target.protein > 0 ? macrosConsumed.protein / target.protein : 0,
    target.carbs > 0 ? macrosConsumed.carbs / target.carbs : 0,
    target.fat > 0 ? macrosConsumed.fat / target.fat : 0,
  ];

  const average = ratios.reduce((acc, value) => acc + value, 0) / ratios.length;
  return Math.min(100, Math.max(0, Math.round(average * 100)));
};

dailyLogSchema.pre("save", async function preSave(next) {
  try {
    const doc = this as HydratedDocument<IDailyLog>;
    const totalMacrosConsumed = sumMacros(doc.mealLogs ?? []);
    doc.totalMacrosConsumed = totalMacrosConsumed;
    const compliance = await calculateCompliance(doc.userId, totalMacrosConsumed);
    if (compliance !== null) {
      doc.macroCompliancePercent = compliance;
    }
    next();
  } catch (error) {
    next(error as Error);
  }
});

export const DailyLogModel = model<IDailyLog>("DailyLog", dailyLogSchema);
