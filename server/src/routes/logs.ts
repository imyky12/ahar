import { Router } from "express";

import {
  energySchema,
  getDailyLog,
  getDailyStats,
  logEnergy,
  logMeal,
  mealSchema,
  logSleep,
  sleepSchema,
  logWater,
  skipSchema,
  waterSchema,
  skipMealWithAlternative,
} from "../controllers/dailyLogController";
import {
  clientErrorSchema,
  getAllStreaksForUser,
  getGymHistory,
  logGymSchema,
  getWeekHistory,
  logClientError,
  logGym,
} from "../controllers/logsController";
import { authenticate, clientErrorRateLimiter } from "../middleware/auth";
import { validate } from "../middleware/validate";

export const logsRouter = Router();

logsRouter.post("/energy", authenticate, validate(energySchema), logEnergy);
logsRouter.post("/sleep", authenticate, validate(sleepSchema), logSleep);
logsRouter.post("/water", authenticate, validate(waterSchema), logWater);
logsRouter.post("/meal", authenticate, validate(mealSchema), logMeal);
logsRouter.post(
  "/meal/skip",
  authenticate,
  validate(skipSchema),
  skipMealWithAlternative,
);
logsRouter.get("/daily", authenticate, getDailyLog);
logsRouter.get("/stats", authenticate, getDailyStats);
logsRouter.post("/gym", authenticate, validate(logGymSchema), logGym);
logsRouter.get("/gym/history", authenticate, getGymHistory);
logsRouter.get("/week", authenticate, getWeekHistory);
logsRouter.get("/streaks", authenticate, getAllStreaksForUser);
logsRouter.post(
  "/client-error",
  authenticate,
  clientErrorRateLimiter,
  validate(clientErrorSchema),
  logClientError,
);
