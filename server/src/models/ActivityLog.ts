import { Schema, model } from "mongoose";

export interface IActivityLog {
  userId: string;
  action: string;
  metadata: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const activityLogSchema = new Schema<IActivityLog>(
  {
    userId: { type: String, required: true },
    action: { type: String, required: true },
    metadata: {
      type: Schema.Types.Mixed,
      required: true,
      default: {},
    },
    ipAddress: { type: String, required: false },
    userAgent: { type: String, required: false },
    timestamp: { type: Date, required: true },
    isDeleted: { type: Boolean, default: false },
  },
  { versionKey: false, timestamps: true },
);

activityLogSchema.index({ userId: 1, timestamp: -1 });
activityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 3600 });

export const ActivityLogModel = model<IActivityLog>(
  "ActivityLog",
  activityLogSchema,
);
