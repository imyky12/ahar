import { Schema, model, type Types } from "mongoose";

export type StreakType = "diet" | "gym" | "water" | "sleep";

export interface IStreak {
  _id?: Types.ObjectId;
  userId: string;
  type: StreakType;
  currentStreak: number;
  longestStreak: number;
  lastLoggedDate: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const streakSchema = new Schema<IStreak>(
  {
    userId: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ["diet", "gym", "water", "sleep"],
      required: true,
    },
    currentStreak: { type: Number, default: 0, required: true },
    longestStreak: { type: Number, default: 0, required: true },
    lastLoggedDate: {
      type: String,
      default: "1970-01-01",
      required: false,
    },
    isDeleted: { type: Boolean, default: false, required: true },
  },
  {
    timestamps: true,
  },
);

streakSchema.pre("validate", function (next) {
  if (!this.lastLoggedDate) {
    this.lastLoggedDate = "1970-01-01";
  }
  next();
});

streakSchema.index({ userId: 1, type: 1 }, { unique: true });

export const StreakModel = model<IStreak>("Streak", streakSchema);
