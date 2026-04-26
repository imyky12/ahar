import { addDays } from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import { getDay } from "date-fns";

import { MedicineReminderModel } from "../models/MedicineReminder";
import type { DayOfWeek } from "../models/MedicineReminder";
import { NotificationModel } from "../models/Notification";
import { UserProfileModel } from "../models/UserProfile";
import { UserNotificationSettingsModel } from "../models/UserNotificationSettings";

const SCHEDULE_DAYS_AHEAD = 7;
const reminderNotificationType = "medicine_reminder" as const;

const parseHHMM = (value: string): { hour: number; minute: number } => {
  const [hourRaw, minuteRaw] = value.split(":");
  return { hour: Number(hourRaw), minute: Number(minuteRaw) };
};

const minutesSinceMidnight = (date: Date): number =>
  date.getHours() * 60 + date.getMinutes();

const isWithinQuietHours = (
  localDate: Date,
  quietStart: string,
  quietEnd: string,
): boolean => {
  const start = parseHHMM(quietStart);
  const end = parseHHMM(quietEnd);
  const current = minutesSinceMidnight(localDate);
  const startMinutes = start.hour * 60 + start.minute;
  const endMinutes = end.hour * 60 + end.minute;

  if (startMinutes < endMinutes) {
    return current >= startMinutes && current < endMinutes;
  }
  return current >= startMinutes || current < endMinutes;
};

const rescheduleToQuietEnd = (
  scheduledForUtc: Date,
  timezone: string,
  quietEnd: string,
): Date => {
  const end = parseHHMM(quietEnd);
  const hh = end.hour.toString().padStart(2, "0");
  const mm = end.minute.toString().padStart(2, "0");

  const localDate = formatInTimeZone(scheduledForUtc, timezone, "yyyy-MM-dd");
  let candidate = fromZonedTime(`${localDate}T${hh}:${mm}:00`, timezone);

  if (candidate.getTime() <= scheduledForUtc.getTime()) {
    const nextDate = formatInTimeZone(
      addDays(scheduledForUtc, 1),
      timezone,
      "yyyy-MM-dd",
    );
    candidate = fromZonedTime(`${nextDate}T${hh}:${mm}:00`, timezone);
  }

  return candidate;
};

export const cancelMedicineReminderNotifications = async (
  userId: string,
  medicineId?: string,
): Promise<void> => {
  const filter: Record<string, unknown> = {
    userId,
    isSent: false,
    isDeleted: false,
    type: reminderNotificationType,
  };

  if (medicineId) {
    filter["data.medicineId"] = medicineId;
  }

  await NotificationModel.updateMany(filter, { $set: { isDeleted: true } });
};

export const scheduleMedicineReminderNotifications = async (
  userId: string,
  medicineId?: string,
): Promise<void> => {
  const [profile, settingsDoc] = await Promise.all([
    UserProfileModel.findOne({ userId, isDeleted: { $ne: true } })
      .select("location.timezone")
      .lean(),
    UserNotificationSettingsModel.findOne({ userId }).lean(),
  ]);

  const notificationsEnabled = settingsDoc?.notificationsEnabled ?? true;
  const medicineReminderEnabled =
    settingsDoc?.enabledTypes?.medicine_reminder ?? true;

  if (!notificationsEnabled || !medicineReminderEnabled) {
    return;
  }

  const timezone = profile?.location?.timezone ?? "Asia/Kolkata";
  const quietStart = settingsDoc?.quietHoursStart ?? "23:00";
  const quietEnd = settingsDoc?.quietHoursEnd ?? "07:00";

  const filter: Record<string, unknown> = {
    userId,
    active: true,
    isDeleted: false,
  };

  if (medicineId) {
    filter._id = medicineId;
  }

  const reminders = await MedicineReminderModel.find(filter).lean();

  if (!reminders.length) {
    return;
  }

  await cancelMedicineReminderNotifications(userId, medicineId);

  const now = new Date();
  const records: Record<string, unknown>[] = [];

  for (const reminder of reminders) {
    for (let i = 0; i < SCHEDULE_DAYS_AHEAD; i++) {
      const targetDay = addDays(now, i);
      const zonedDay = toZonedTime(targetDay, timezone);

      // daysOfWeek empty = fire every day
      if (reminder.daysOfWeek.length > 0) {
        const dayOfWeek = getDay(zonedDay) as DayOfWeek;
        if (!reminder.daysOfWeek.includes(dayOfWeek)) {
          continue;
        }
      }

      const localDate = formatInTimeZone(targetDay, timezone, "yyyy-MM-dd");
      let scheduledFor = fromZonedTime(
        `${localDate}T${reminder.time}:00`,
        timezone,
      );

      if (scheduledFor.getTime() <= now.getTime()) {
        continue;
      }

      const localScheduled = toZonedTime(scheduledFor, timezone);
      if (isWithinQuietHours(localScheduled, quietStart, quietEnd)) {
        scheduledFor = rescheduleToQuietEnd(scheduledFor, timezone, quietEnd);
      }

      records.push({
        userId,
        type: reminderNotificationType,
        title: "Medicine reminder 💊",
        body: `${reminder.name} ${reminder.dosage}${reminder.withFood ? " • Take with food" : ""}`,
        data: {
          screen: "settings",
          action: "medicine_reminder",
          medicineId: String(reminder._id),
          medicineName: reminder.name,
        },
        scheduledFor,
        isSent: false,
        isRead: false,
        sound: "chime",
        priority: "high",
        isDeleted: false,
      });
    }
  }

  if (records.length) {
    try {
      await NotificationModel.insertMany(records, { ordered: false });
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code: number }).code !== 11000
      ) {
        throw error;
      }
    }
  }
};
