import { Schema, model, type Types } from "mongoose";

type PrepTaskType = "soak" | "marinate" | "defrost" | "other";

export interface IPrepTaskDocument {
  _id?: Types.ObjectId;
  id: string;
  instruction: string;
  scheduledFor: string;
  isDone: boolean;
  type: PrepTaskType;
  userId: string;
  date: string;
  planId: Types.ObjectId;
  notificationId?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const prepTaskSchema = new Schema<IPrepTaskDocument>(
  {
    id: { type: String, required: true },
    instruction: { type: String, required: true },
    scheduledFor: { type: String, required: true },
    isDone: { type: Boolean, default: false, required: true },
    type: {
      type: String,
      enum: ["soak", "marinate", "defrost", "other"],
      required: true,
    },
    userId: { type: String, required: true, index: true },
    date: { type: String, required: true, index: true },
    planId: {
      type: Schema.Types.ObjectId,
      ref: "DietPlan",
      required: true,
      index: true,
    },
    notificationId: { type: String, required: false },
    isDeleted: { type: Boolean, default: false, required: true },
  },
  {
    timestamps: true,
  },
);

prepTaskSchema.index({ userId: 1, date: 1 });

export const PrepTaskModel = model<IPrepTaskDocument>(
  "PrepTask",
  prepTaskSchema,
);
