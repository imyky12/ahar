import { Schema, model, type Types } from "mongoose";

export interface IWeightLog {
  _id?: Types.ObjectId;
  userId: string;
  date: string;
  weightKg: number;
  bodyFatPercent?: number;
  muscleMassKg?: number;
  notes?: string;
  source: "manual" | "weekly_checkin";
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const weightLogSchema = new Schema<IWeightLog>(
  {
    userId: { type: String, required: true, index: true },
    date: { type: String, required: true },
    weightKg: { type: Number, required: true, min: 20, max: 400 },
    bodyFatPercent: { type: Number, required: false, min: 3, max: 70 },
    muscleMassKg: { type: Number, required: false },
    notes: { type: String, required: false },
    source: {
      type: String,
      enum: ["manual", "weekly_checkin"],
      default: "manual",
      required: true,
    },
    isDeleted: { type: Boolean, default: false, required: true },
  },
  { timestamps: true },
);

weightLogSchema.index({ userId: 1, date: 1 }, { unique: true });

export const WeightLogModel = model<IWeightLog>("WeightLog", weightLogSchema);
