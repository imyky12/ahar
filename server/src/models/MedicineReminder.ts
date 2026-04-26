import { Schema, model, type Types } from "mongoose";

// 0 = Sunday … 6 = Saturday (matches JS Date.getDay())
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface IMedicineReminder {
  _id?: Types.ObjectId;
  userId: string;
  name: string;
  dosage: string;
  time: string;           // HH:mm — the single daily dose time
  daysOfWeek: DayOfWeek[]; // which days this reminder fires; empty = every day
  instructions?: string;
  withFood: boolean;
  active: boolean;
  dosesLogged: number;
  refillReminderDays: number; // warn user N days before they run out (0 = disabled)
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const medicineReminderSchema = new Schema<IMedicineReminder>(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    dosage: { type: String, required: true },
    time: { type: String, required: true },
    daysOfWeek: {
      type: [Number],
      default: [],   // empty = fire every day
      validate: {
        validator: (v: number[]) => v.every((d) => d >= 0 && d <= 6),
        message: "daysOfWeek values must be 0–6",
      },
    },
    instructions: { type: String, required: false },
    withFood: { type: Boolean, default: false, required: true },
    active: { type: Boolean, default: true, required: true },
    dosesLogged: { type: Number, default: 0, required: true },
    refillReminderDays: { type: Number, default: 0, required: true },
    isDeleted: { type: Boolean, default: false, required: true },
  },
  {
    timestamps: true,
  },
);

medicineReminderSchema.index({ userId: 1, time: 1 });

export const MedicineReminderModel = model<IMedicineReminder>(
  "MedicineReminder",
  medicineReminderSchema,
);
