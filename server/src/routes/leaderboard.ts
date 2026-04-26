import { Router } from "express";

import { getLeaderboardController } from "../controllers/leaderboardController";
import { authenticate } from "../middleware/auth";

export const leaderboardRouter = Router();

leaderboardRouter.get("/", authenticate, getLeaderboardController);
