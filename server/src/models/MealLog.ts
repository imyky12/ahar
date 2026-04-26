import { Schema, model, type Types } from "mongoose";

import type { IFoodItem, IMacros } from "./DietPlan";

export interface IMealLog {
  _id?: Types.ObjectId;
  userId: string;
  date: string;
  planId: Types.ObjectId;
  mealId: string;
  mealLabel: string;
  mealTimeSlot: string;
  status: "done" | "skipped" | "alternative";
  alternativeItems: IFoodItem[];
  macrosConsumed: IMacros;
  loggedAt: Date;
  responseTimeMs?: number;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const macrosSchema = new Schema<IMacros>(
  {
    protein: { type: Number, required: true, default: 0 },
    carbs: { type: Number, required: true, default: 0 },
    fat: { type: Number, required: true, default: 0 },
    calories: { type: Number, required: true, default: 0 },
  },
  { _id: false },
);

const alternativeItemSchema = new Schema<IFoodItem>(
  {
    name: { type: String, required: true },
    quantity: { type: String, required: true },
    unit: { type: String, required: true },
    macros: { type: macrosSchema, required: true },
    cookTimeMinutes: { type: Number, required: true },
  },
  { _id: false },
);

const mealLogSchema = new Schema<IMealLog>(
  {
    userId: { type: String, required: true, index: true },
    date: { type: String, required: true, index: true },
    planId: { type: Schema.Types.ObjectId, ref: "DietPlan", required: true },
    mealId: { type: String, required: true },
    mealLabel: { type: String, required: true },
    mealTimeSlot: { type: String, required: true },
    status: {
      type: String,
      enum: ["done", "skipped", "alternative"],
      required: true,
    },
    alternativeItems: { type: [alternativeItemSchema], default: [] },
    macrosConsumed: { type: macrosSchema, required: true },
    loggedAt: { type: Date, required: true, default: () => new Date() },
    responseTimeMs: { type: Number, required: false },
    isDeleted: { type: Boolean, default: false, required: true },
  },
  {
    timestamps: true,
  },
);

mealLogSchema.index({ userId: 1, date: 1 });
mealLogSchema.index({ userId: 1, mealId: 1, date: 1 }, { unique: true });

export const MealLogModel = model<IMealLog>("MealLog", mealLogSchema);
