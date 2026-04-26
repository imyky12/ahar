import { addDays, subDays } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

import { NotificationModel } from "../models/Notification";
import { StreakModel, type IStreak, type StreakType } from "../models/Streak";
import { UserNotificationSettingsModel } from "../models/UserNotificationSettings";
import { UserProfileModel } from "../models/UserProfile";
import { logger } from "../utils/logger";
import { awardBadge } from "./badgeService";
import { sendImmediateNotification } from "./notificationService";

const STREAK_TYPES: StreakType[] = ["diet", "gym", "water", "sleep"];

const toTodayStrings = async (
  userId: string,
): Promise<{ today: string; yesterday: string }> => {
  const profile = await UserProfileModel.findOne({
    userId,
    isDeleted: { $ne: true },
  }).lean();
  const timezone = profile?.location.timezone ?? "Asia/Kolkata";
  const now = new Date();

  return {
    today: formatInTimeZone(now, timezone, "yyyy-MM-dd"),
    yesterday: formatInTimeZone(subDays(now, 1), timezone, "yyyy-MM-dd"),
  };
};

const getOrCreateStreak = async (
  userId: string,
  type: StreakType,
): Promise<IStreak> => {
  const existing = await StreakModel.findOne({ userId, type }).lean();

  if (existing) {
    if (!existing.lastLoggedDate) {
      const repaired = await StreakModel.findOneAndUpdate(
        { userId, type },
        {
          $set: {
            lastLoggedDate: "1970-01-01",
            isDeleted: false,
          },
        },
        { new: true },
      ).lean();

      if (repaired) {
        return repaired;
      }
    }

    return existing;
  }

  const created = await StreakModel.create({
    userId,
    type,
    currentStreak: 0,
    longestStreak: 0,
    lastLoggedDate: "1970-01-01",
    isDeleted: false,
  });

  return created.toObject();
};

const notifyMilestone = async (
  userId: string,
  type: StreakType,
  current: number,
): Promise<void> => {
  const title = `${type === "diet" ? "Diet" : type === "gym" ? "Gym" : type === "water" ? "Water" : "Sleep"} streak milestone 🔥`;
  const body = `You're on a ${current}-day ${type} streak. Keep it going!`;

  await sendImmediateNotification({
    userId,
    type: "streak_milestone",
    title,
    body,
    data: { screen: "dashboard", action: "streak_milestone", streakType: type },
    sound: "chime",
    priority: "high",
  });
};

export const updateStreak = async (
  userId: string,
  type: StreakType,
): Promise<IStreak> => {
  try {
    const streak = await getOrCreateStreak(userId, type);
    const { today, yesterday } = await toTodayStrings(userId);

    let nextCurrent = streak.currentStreak;
    let nextLongest = streak.longestStreak;

    if (streak.lastLoggedDate === today) {
      return streak;
    }

    if (streak.lastLoggedDate === yesterday) {
      nextCurrent = streak.currentStreak + 1;
    } else {
      nextCurrent = 1;
    }

    nextLongest = Math.max(nextLongest, nextCurrent);

    const updated = await StreakModel.findOneAndUpdate(
      { userId, type },
      {
        $set: {
          currentStreak: nextCurrent,
          longestStreak: nextLongest,
          lastLoggedDate: today,
          isDeleted: false,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();

    if (!updated) {
      throw new Error("STREAK_UPDATE_FAILED");
    }

    const milestoneBadges: Record<number, string | undefined> = {
      7: "7_day_streak",
      14: "14_day_streak",
      30: "30_day_streak",
    };

    const badgeId = milestoneBadges[nextCurrent];
    if (badgeId) {
      await awardBadge(userId, badgeId);
      await notifyMilestone(userId, type, nextCurrent);
    }

    return updated;
  } catch (error) {
    logger.warn(`updateStreak failed for user=${userId}: ${String(error)}`);
    throw error;
  }
};

export const getAllStreaks = async (userId: string): Promise<IStreak[]> => {
  const results = await Promise.all(
    STREAK_TYPES.map(async (type) => getOrCreateStreak(userId, type)),
  );

  return results;
};
