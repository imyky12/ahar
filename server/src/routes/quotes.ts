import { Router } from "express";

import { getTodaysQuoteController } from "../controllers/quotesController";
import { authenticate } from "../middleware/auth";

export const quotesRouter = Router();

quotesRouter.get("/today", authenticate, getTodaysQuoteController);
