import { Schema, model, type Types } from "mongoose";

type ActivityType = "gym" | "run" | "walk" | "home" | "yoga" | "rest";

export interface IGymLog {
  _id?: Types.ObjectId;
  userId: string;
  date: string;
  musclesHit: string[];
  activityType: ActivityType;
  durationMinutes?: number;
  notes?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const gymLogSchema = new Schema<IGymLog>(
  {
    userId: { type: String, required: true, index: true },
    date: { type: String, required: true, index: true },
    musclesHit: { type: [String], required: true, default: [] },
    activityType: {
      type: String,
      enum: ["gym", "run", "walk", "home", "yoga", "rest"],
      required: true,
    },
    durationMinutes: { type: Number, required: false },
    notes: { type: String, required: false },
    isDeleted: { type: Boolean, default: false, required: true },
  },
  {
    timestamps: true,
  },
);

gymLogSchema.index({ userId: 1, date: -1 });

export const GymLogModel = model<IGymLog>("GymLog", gymLogSchema);
