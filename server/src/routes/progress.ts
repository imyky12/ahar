import { Router } from "express";

import {
  addWeightLogController,
  checkinPayloadSchema,
  getProgressHistoryController,
  getProgressStatsController,
  getWeeklySummary,
  markBadgesSeenController,
  submitWeeklyCheckin,
  weightLogSchema,
} from "../controllers/weeklyCheckinController";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";

export const progressRouter = Router();

progressRouter.post(
  "/checkin",
  authenticate,
  validate(checkinPayloadSchema),
  submitWeeklyCheckin,
);
progressRouter.get("/weekly-summary", authenticate, getWeeklySummary);
progressRouter.get("/stats", authenticate, getProgressStatsController);
progressRouter.get("/history", authenticate, getProgressHistoryController);
progressRouter.post(
  "/weight",
  authenticate,
  validate(weightLogSchema),
  addWeightLogController,
);
progressRouter.post("/badges/seen", authenticate, markBadgesSeenController);
