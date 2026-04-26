import { Router } from "express";

import {
  getMe,
  loginSchema,
  login,
  logout,
  refreshSchema,
  refresh,
  registerSchema,
  register,
} from "../controllers/authController";
import { authenticate, authRateLimiter } from "../middleware/auth";
import { validate } from "../middleware/validate";

export const authRouter = Router();

authRouter.post(
  "/register",
  authRateLimiter,
  validate(registerSchema),
  register,
);
authRouter.post("/login", authRateLimiter, validate(loginSchema), login);
authRouter.post("/refresh", authRateLimiter, validate(refreshSchema), refresh);
authRouter.post("/logout", authenticate, logout);
authRouter.get("/me", authenticate, getMe);
