import { Schema, model } from "mongoose";

export interface IAuditLog {
  userId: string;
  action: string;
  prompt: string;
  response: string;
  tokensUsed: number;
  costEstimateUsd: number;
  model: string;
  durationMs: number;
  success: boolean;
  errorMessage?: string;
  timestamp: Date;
  isDeleted: boolean;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    userId: { type: String, required: true },
    action: { type: String, required: true },
    prompt: { type: String, required: true },
    response: { type: String, required: true },
    tokensUsed: { type: Number, required: true },
    costEstimateUsd: { type: Number, required: true },
    model: { type: String, required: true },
    durationMs: { type: Number, required: true },
    success: { type: Boolean, required: true },
    errorMessage: { type: String, required: false },
    timestamp: { type: Date, required: true },
    isDeleted: { type: Boolean, default: false },
  },
  { versionKey: false },
);

auditLogSchema.index({ userId: 1, timestamp: -1 });

export const AuditLogModel = model<IAuditLog>("AuditLog", auditLogSchema);
