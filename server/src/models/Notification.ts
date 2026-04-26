import { Schema, model, type Types } from "mongoose";

export type NotificationType =
  | "plan_ready"
  | "prep_task"
  | "meal_checkin"
  | "water_reminder"
  | "walk_reminder"
  | "skin_care"
  | "supplement"
  | "gym_log"
  | "sleep_checkin"
  | "macro_alert"
  | "weekly_checkin"
  | "energy_checkin"
  | "grocery_ready"
  | "streak_milestone"
  | "daily_quote"
  | "medicine_reminder";

export type NotificationSound = "default" | "gentle" | "alert" | "chime";
export type NotificationPriority = "low" | "normal" | "high";

export interface INotification {
  _id?: Types.ObjectId;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  scheduledFor: Date;
  sentAt?: Date;
  isSent: boolean;
  isRead: boolean;
  expoNotificationId?: string;
  sound: NotificationSound;
  priority: NotificationPriority;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: [
        "plan_ready",
        "prep_task",
        "meal_checkin",
        "water_reminder",
        "walk_reminder",
        "skin_care",
        "supplement",
        "gym_log",
        "sleep_checkin",
        "macro_alert",
        "weekly_checkin",
        "energy_checkin",
        "grocery_ready",
        "streak_milestone",
        "daily_quote",
        "medicine_reminder",
      ],
      required: true,
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    data: { type: Schema.Types.Mixed, default: {} },
    scheduledFor: { type: Date, required: true },
    sentAt: { type: Date, required: false },
    isSent: { type: Boolean, default: false, required: true },
    isRead: { type: Boolean, default: false, required: true },
    expoNotificationId: { type: String, required: false },
    sound: {
      type: String,
      enum: ["default", "gentle", "alert", "chime"],
      default: "default",
      required: true,
    },
    priority: {
      type: String,
      enum: ["low", "normal", "high"],
      default: "normal",
      required: true,
    },
    isDeleted: { type: Boolean, default: false, required: true },
  },
  {
    timestamps: true,
  },
);

notificationSchema.index({ userId: 1, scheduledFor: 1 });
notificationSchema.index({ userId: 1, isSent: 1, scheduledFor: 1 });
notificationSchema.index({ isSent: 1, scheduledFor: 1 });

export const NotificationModel = model<INotification>(
  "Notification",
  notificationSchema,
);
