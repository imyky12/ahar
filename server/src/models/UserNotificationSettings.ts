import { Schema, model, type Types } from "mongoose";

export interface IEnabledNotificationTypes {
  plan_ready: boolean;
  prep_task: boolean;
  meal_checkin: boolean;
  water_reminder: boolean;
  walk_reminder: boolean;
  skin_care: boolean;
  supplement: boolean;
  gym_log: boolean;
  sleep_checkin: boolean;
  macro_alert: boolean;
  weekly_checkin: boolean;
  energy_checkin: boolean;
  grocery_ready: boolean;
  streak_milestone: boolean;
  daily_quote: boolean;
  medicine_reminder: boolean;
}

export interface IUserNotificationSettings {
  _id?: Types.ObjectId;
  userId: string;
  expoPushToken?: string;
  notificationsEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  enabledTypes: IEnabledNotificationTypes;
  waterReminderIntervalMinutes: number;
  quotePreference: "motivational" | "funny" | "fitness" | "mindfulness" | "mixed";
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const enabledTypesDefaults: IEnabledNotificationTypes = {
  plan_ready: true,
  prep_task: true,
  meal_checkin: true,
  water_reminder: true,
  walk_reminder: true,
  skin_care: true,
  supplement: true,
  gym_log: true,
  sleep_checkin: true,
  macro_alert: true,
  weekly_checkin: true,
  energy_checkin: true,
  grocery_ready: true,
  streak_milestone: true,
  daily_quote: true,
  medicine_reminder: true,
};

const userNotificationSettingsSchema = new Schema<IUserNotificationSettings>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    expoPushToken: { type: String, required: false },
    notificationsEnabled: { type: Boolean, default: true, required: true },
    quietHoursStart: { type: String, default: "23:00", required: true },
    quietHoursEnd: { type: String, default: "07:00", required: true },
    enabledTypes: {
      plan_ready: { type: Boolean, default: true },
      prep_task: { type: Boolean, default: true },
      meal_checkin: { type: Boolean, default: true },
      water_reminder: { type: Boolean, default: true },
      walk_reminder: { type: Boolean, default: true },
      skin_care: { type: Boolean, default: true },
      supplement: { type: Boolean, default: true },
      gym_log: { type: Boolean, default: true },
      sleep_checkin: { type: Boolean, default: true },
      macro_alert: { type: Boolean, default: true },
      weekly_checkin: { type: Boolean, default: true },
      energy_checkin: { type: Boolean, default: true },
      grocery_ready: { type: Boolean, default: true },
      streak_milestone: { type: Boolean, default: true },
      daily_quote: { type: Boolean, default: true },
      medicine_reminder: { type: Boolean, default: true },
    },
    waterReminderIntervalMinutes: { type: Number, default: 90, required: true },
    quotePreference: {
      type: String,
      enum: ["motivational", "funny", "fitness", "mindfulness", "mixed"],
      default: "motivational",
      required: true,
    },
    isDeleted: { type: Boolean, default: false, required: true },
  },
  {
    timestamps: true,
  },
);

userNotificationSettingsSchema.pre("validate", function preValidate(next) {
  if (!this.enabledTypes) {
    this.enabledTypes = enabledTypesDefaults;
  }
  next();
});

export const UserNotificationSettingsModel = model<IUserNotificationSettings>(
  "UserNotificationSettings",
  userNotificationSettingsSchema,
);
