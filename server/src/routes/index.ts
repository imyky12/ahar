import { Router } from "express";

import { authRouter } from "./auth";
import { leaderboardRouter } from "./leaderboard";
import { logsRouter } from "./logs";
import { medicinesRouter } from "./medicines";
import { notificationsRouter } from "./notifications";
import { plansRouter } from "./plans";
import { progressRouter } from "./progress";
import { profileRouter } from "./profile";
import { quotesRouter } from "./quotes";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/logs", logsRouter);
apiRouter.use("/notifications", notificationsRouter);
apiRouter.use("/profile", profileRouter);
apiRouter.use("/plans", plansRouter);
apiRouter.use("/progress", progressRouter);
apiRouter.use("/leaderboard", leaderboardRouter);
apiRouter.use("/quotes", quotesRouter);
apiRouter.use("/medicines", medicinesRouter);
