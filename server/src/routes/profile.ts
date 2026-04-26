import { Router } from "express";

import {
  createProfile,
  deleteAccount,
  deleteAccountSchema,
  exportUserData,
  getChronicConditionsController,
  getUpcomingFestivalsController,
  getProfile,
  profileCreateSchema,
  uploadAvatar,
  uploadAvatarSchema,
  profileUpdateSchema,
  updateProfile,
} from "../controllers/profileController";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";

export const profileRouter = Router();

profileRouter.post(
  "/",
  authenticate,
  validate(profileCreateSchema),
  createProfile,
);
profileRouter.get("/", authenticate, getProfile);
profileRouter.put(
  "/",
  authenticate,
  validate(profileUpdateSchema),
  updateProfile,
);
profileRouter.post(
  "/avatar",
  authenticate,
  validate(uploadAvatarSchema),
  uploadAvatar,
);
profileRouter.get("/festivals", authenticate, getUpcomingFestivalsController);
profileRouter.get(
  "/chronic-conditions",
  authenticate,
  getChronicConditionsController,
);
profileRouter.get("/export", authenticate, exportUserData);
profileRouter.post(
  "/delete",
  authenticate,
  validate(deleteAccountSchema),
  deleteAccount,
);
