import { Schema, model, type Types } from "mongoose";

export interface IWeeklyCheckin {
  _id?: Types.ObjectId;
  userId: string;
  weekStart: string;
  weekEnd: string;
  weight: number;
  sleepQualityAvg: number;
  mealComplianceRate: number;
  gymDays: number;
  gymDaysActual: number;
  avgSleepHours: number;
  avgEnergyLevel: number;
  waterGoalHitDays: number;
  aiPromptTokens: number;
  aiSummary: string;
  headline: string;
  score: number;
  wins: string[];
  improvements: string[];
  adjustments: string[];
  focusTip: string;
  motivationalNote: string;
  status: "pending" | "generating" | "ready" | "failed";
  generatedAt?: Date;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const weeklyCheckinSchema = new Schema<IWeeklyCheckin>(
  {
    userId: { type: String, required: true, index: true },
    weekStart: { type: String, required: true },
    weekEnd: { type: String, required: true },
    weight: { type: Number, required: true },
    sleepQualityAvg: { type: Number, required: true, default: 0 },
    mealComplianceRate: { type: Number, required: true, default: 0 },
    gymDays: { type: Number, required: true, default: 0 },
    gymDaysActual: { type: Number, required: true, default: 0 },
    avgSleepHours: { type: Number, required: true, default: 0 },
    avgEnergyLevel: { type: Number, required: true, default: 0 },
    waterGoalHitDays: { type: Number, required: true, default: 0 },
    aiPromptTokens: { type: Number, required: true, default: 0 },
    aiSummary: { type: String, required: true, default: "" },
    headline: { type: String, required: true, default: "" },
    score: { type: Number, required: true, default: 0 },
    wins: { type: [String], required: true, default: [] },
    improvements: { type: [String], required: true, default: [] },
    adjustments: { type: [String], required: true, default: [] },
    focusTip: { type: String, required: true, default: "" },
    motivationalNote: { type: String, required: true, default: "" },
    status: {
      type: String,
      enum: ["pending", "generating", "ready", "failed"],
      default: "pending",
      required: true,
    },
    generatedAt: { type: Date, required: false },
    isDeleted: { type: Boolean, default: false, required: true },
  },
  { timestamps: true },
);

weeklyCheckinSchema.index({ userId: 1, weekStart: 1 }, { unique: true });

export const WeeklyCheckinModel = model<IWeeklyCheckin>(
  "WeeklyCheckin",
  weeklyCheckinSchema,
);
