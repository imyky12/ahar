import { Schema, model, type Types } from "mongoose";

export interface IMedicineLog {
  _id?: Types.ObjectId;
  userId: string;
  reminderId: Types.ObjectId;
  date: string;         // YYYY-MM-DD
  timingLabel: string;  // e.g. "08:00" or "Morning"
  status: "taken" | "skipped";
  loggedAt: Date;
  notes?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const medicineLogSchema = new Schema<IMedicineLog>(
  {
    userId: { type: String, required: true, index: true },
    reminderId: {
      type: Schema.Types.ObjectId,
      ref: "MedicineReminder",
      required: true,
    },
    date: { type: String, required: true },
    timingLabel: { type: String, required: true },
    status: {
      type: String,
      enum: ["taken", "skipped"],
      required: true,
    },
    loggedAt: { type: Date, required: true, default: () => new Date() },
    notes: { type: String, required: false },
    isDeleted: { type: Boolean, default: false, required: true },
  },
  {
    timestamps: true,
  },
);

// Primary query index: all dose logs for a user's reminder on a given day
medicineLogSchema.index({ userId: 1, reminderId: 1, date: 1 });

// Prevent double-logging the same dose timing on the same day
medicineLogSchema.index(
  { userId: 1, reminderId: 1, date: 1, timingLabel: 1 },
  { unique: true },
);

export const MedicineLogModel = model<IMedicineLog>(
  "MedicineLog",
  medicineLogSchema,
);
