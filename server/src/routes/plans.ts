import { Router } from "express";

import {
  alternativesSchema,
  getAlternatives,
  getPlanByDate,
  getTodaysPlan,
  getTomorrowsPlan,
  triggerManualGeneration,
  updatePrepTaskSchema,
  updatePrepTask,
} from "../controllers/planController";
import { aiRateLimiter, authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";

export const plansRouter = Router();

plansRouter.get("/today", authenticate, getTodaysPlan);
plansRouter.get("/tomorrow", authenticate, getTomorrowsPlan);
plansRouter.get("/:date", authenticate, getPlanByDate);
plansRouter.post(
  "/generate",
  authenticate,
  aiRateLimiter,
  triggerManualGeneration,
);
plansRouter.put(
  "/prep-task",
  authenticate,
  validate(updatePrepTaskSchema),
  updatePrepTask,
);
plansRouter.post(
  "/alternatives",
  authenticate,
  validate(alternativesSchema),
  getAlternatives,
);
