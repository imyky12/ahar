import { Router } from "express";

import {
  emptyPayloadSchema,
  getNotificationDebug,
  getNotificationHistory,
  getSettings,
  markAsRead,
  markReadSchema,
  registerToken,
  rescheduleNotifications,
  tokenSchema,
  updateSettings,
  updateSettingsSchema,
} from "../controllers/notificationController";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";

export const notificationsRouter = Router();

notificationsRouter.post(
  "/token",
  authenticate,
  validate(tokenSchema),
  registerToken,
);
notificationsRouter.get("/history", authenticate, getNotificationHistory);
notificationsRouter.get("/debug", authenticate, getNotificationDebug);
notificationsRouter.put(
  "/read",
  authenticate,
  validate(markReadSchema),
  markAsRead,
);
notificationsRouter.get("/settings", authenticate, getSettings);
notificationsRouter.put(
  "/settings",
  authenticate,
  validate(updateSettingsSchema),
  updateSettings,
);
notificationsRouter.post(
  "/reschedule",
  authenticate,
  validate(emptyPayloadSchema),
  rescheduleNotifications,
);
