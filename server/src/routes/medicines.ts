import { Router } from "express";

import {
  createMedicineReminder,
  deleteMedicineReminder,
  getDoseLogs,
  listMedicineReminders,
  logDose,
  medicineReminderSchema,
  medicineReminderUpdateSchema,
  updateMedicineReminder,
} from "../controllers/medicineReminderController";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";

export const medicinesRouter = Router();

medicinesRouter.get("/", authenticate, listMedicineReminders);
medicinesRouter.post(
  "/",
  authenticate,
  validate(medicineReminderSchema),
  createMedicineReminder,
);
medicinesRouter.put(
  "/:id",
  authenticate,
  validate(medicineReminderUpdateSchema),
  updateMedicineReminder,
);
medicinesRouter.delete("/:id", authenticate, deleteMedicineReminder);

// Dose logging
medicinesRouter.get("/doses", authenticate, getDoseLogs);
medicinesRouter.post("/:id/log", authenticate, logDose);
