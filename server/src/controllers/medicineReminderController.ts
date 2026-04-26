import type { RequestHandler } from "express";
import { z } from "zod";

import { ActivityLogModel } from "../models/ActivityLog";
import { MedicineLogModel } from "../models/MedicineLog";
import { MedicineReminderModel } from "../models/MedicineReminder";
import {
  cancelMedicineReminderNotifications,
  scheduleMedicineReminderNotifications,
} from "../services/medicineReminderService";
import { NotFoundError, UnauthorisedError } from "../utils/errors";

const HHMM_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const medicineReminderSchema = z.object({
  name: z.string().min(2).max(60),
  dosage: z.string().min(1).max(40),
  time: z.string().regex(HHMM_PATTERN, "Invalid medicine time"),
  daysOfWeek: z
    .array(z.number().int().min(0).max(6))
    .max(7)
    .default([]),
  instructions: z.string().max(200).optional(),
  withFood: z.boolean(),
  active: z.boolean().default(true),
  refillReminderDays: z.number().int().min(0).max(365).default(0),
});

export const medicineReminderUpdateSchema = medicineReminderSchema.partial();

export const listMedicineReminders: RequestHandler = async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new UnauthorisedError();
    }

    const reminders = await MedicineReminderModel.find({
      userId: req.userId,
      isDeleted: false,
    })
      .sort({ time: 1 })
      .lean();

    res.status(200).json({ success: true, data: { reminders } });
  } catch (error) {
    next(error);
  }
};

export const createMedicineReminder: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    if (!req.userId) {
      throw new UnauthorisedError();
    }

    const payload = req.body as z.infer<typeof medicineReminderSchema>;

    const reminder = await MedicineReminderModel.create({
      userId: req.userId,
      ...payload,
      isDeleted: false,
    });

    await scheduleMedicineReminderNotifications(
      req.userId,
      String(reminder._id),
    );

    await ActivityLogModel.create({
      userId: req.userId,
      action: "medicine_reminder_created",
      metadata: { medicineId: String(reminder._id), name: reminder.name },
      timestamp: new Date(),
    });

    res.status(201).json({ success: true, data: { reminder } });
  } catch (error) {
    next(error);
  }
};

export const updateMedicineReminder: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    if (!req.userId) {
      throw new UnauthorisedError();
    }

    const id = typeof req.params.id === "string" ? req.params.id : "";
    const payload = req.body as z.infer<typeof medicineReminderUpdateSchema>;

    const reminder = await MedicineReminderModel.findOneAndUpdate(
      { _id: id, userId: req.userId, isDeleted: false },
      { $set: payload },
      { new: true },
    ).lean();

    if (!reminder) {
      throw new NotFoundError("Medicine reminder not found");
    }

    await cancelMedicineReminderNotifications(req.userId, id);
    if (reminder.active) {
      await scheduleMedicineReminderNotifications(req.userId, id);
    }

    await ActivityLogModel.create({
      userId: req.userId,
      action: "medicine_reminder_updated",
      metadata: { medicineId: id, fields: Object.keys(payload) },
      timestamp: new Date(),
    });

    res.status(200).json({ success: true, data: { reminder } });
  } catch (error) {
    next(error);
  }
};

export const deleteMedicineReminder: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    if (!req.userId) {
      throw new UnauthorisedError();
    }

    const id = typeof req.params.id === "string" ? req.params.id : "";

    const reminder = await MedicineReminderModel.findOneAndUpdate(
      { _id: id, userId: req.userId, isDeleted: false },
      { $set: { isDeleted: true, active: false } },
      { new: true },
    ).lean();

    if (!reminder) {
      throw new NotFoundError("Medicine reminder not found");
    }

    await cancelMedicineReminderNotifications(req.userId, id);

    await ActivityLogModel.create({
      userId: req.userId,
      action: "medicine_reminder_deleted",
      metadata: { medicineId: id },
      timestamp: new Date(),
    });

    res.status(200).json({ success: true, data: { message: "Deleted" } });
  } catch (error) {
    next(error);
  }
};

const doseLogSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  timingLabel: z.string().min(1).max(20),
  status: z.enum(["taken", "skipped"]),
  notes: z.string().max(200).optional(),
});

export const logDose: RequestHandler = async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new UnauthorisedError();
    }

    const id = typeof req.params.id === "string" ? req.params.id : "";
    const payload = doseLogSchema.parse(req.body);

    const reminder = await MedicineReminderModel.findOne({
      _id: id,
      userId: req.userId,
      isDeleted: false,
    }).lean();

    if (!reminder) {
      throw new NotFoundError("Medicine reminder not found");
    }

    const log = await MedicineLogModel.findOneAndUpdate(
      {
        userId: req.userId,
        reminderId: reminder._id,
        date: payload.date,
        timingLabel: payload.timingLabel,
      },
      {
        $set: {
          userId: req.userId,
          reminderId: reminder._id,
          date: payload.date,
          timingLabel: payload.timingLabel,
          status: payload.status,
          loggedAt: new Date(),
          notes: payload.notes,
          isDeleted: false,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    if (payload.status === "taken") {
      await MedicineReminderModel.updateOne(
        { _id: reminder._id },
        { $inc: { dosesLogged: 1 } },
      );
    }

    await ActivityLogModel.create({
      userId: req.userId,
      action: "medicine_dose_logged",
      metadata: {
        medicineId: id,
        name: reminder.name,
        date: payload.date,
        timingLabel: payload.timingLabel,
        status: payload.status,
      },
      timestamp: new Date(),
    });

    res.status(200).json({ success: true, data: { log } });
  } catch (error) {
    next(error);
  }
};

export const getDoseLogs: RequestHandler = async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new UnauthorisedError();
    }

    const date =
      typeof req.query.date === "string"
        ? req.query.date
        : new Date().toISOString().slice(0, 10);

    const logs = await MedicineLogModel.find({
      userId: req.userId,
      date,
      isDeleted: false,
    })
      .sort({ loggedAt: 1 })
      .lean();

    res.status(200).json({ success: true, data: { logs } });
  } catch (error) {
    next(error);
  }
};
