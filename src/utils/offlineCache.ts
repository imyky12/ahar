import AsyncStorage from "@react-native-async-storage/async-storage";
import { addDays, isAfter, parseISO } from "date-fns";

import type { DietPlan } from "../types";

const PLAN_KEY_PREFIX = "plan";

const getPlanKey = (userId: string, date: string): string => {
  return `${PLAN_KEY_PREFIX}:${userId}:${date}`;
};

export const clearOldCache = async (userId: string): Promise<void> => {
  const keys = await AsyncStorage.getAllKeys();
  const userPlanKeys = keys.filter((key) =>
    key.startsWith(`${PLAN_KEY_PREFIX}:${userId}:`),
  );

  const threshold = addDays(new Date(), -3);

  const keysToRemove = userPlanKeys.filter((key) => {
    const parts = key.split(":");
    const datePart = parts[2];
    if (!datePart) {
      return true;
    }

    const parsed = parseISO(datePart);
    if (Number.isNaN(parsed.getTime())) {
      return true;
    }

    return isAfter(threshold, parsed);
  });

  if (keysToRemove.length) {
    await AsyncStorage.multiRemove(keysToRemove);
  }
};

export const cachePlan = async (plan: DietPlan): Promise<void> => {
  const key = getPlanKey(plan.userId, plan.date);
  await AsyncStorage.setItem(key, JSON.stringify(plan));
  await clearOldCache(plan.userId);
};

export const getCachedPlan = async (
  userId: string,
  date: string,
): Promise<DietPlan | null> => {
  try {
    const raw = await AsyncStorage.getItem(getPlanKey(userId, date));
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as DietPlan;
  } catch {
    return null;
  }
};

export const getAllCachedPlans = async (
  userId: string,
): Promise<DietPlan[]> => {
  const keys = await AsyncStorage.getAllKeys();
  const userPlanKeys = keys.filter((key) =>
    key.startsWith(`${PLAN_KEY_PREFIX}:${userId}:`),
  );

  if (!userPlanKeys.length) {
    return [];
  }

  const entries = await AsyncStorage.multiGet(userPlanKeys);

  return entries
    .map((entry) => {
      try {
        if (!entry[1]) {
          return null;
        }

        return JSON.parse(entry[1]) as DietPlan;
      } catch {
        return null;
      }
    })
    .filter((plan): plan is DietPlan => Boolean(plan))
    .sort((a, b) => b.date.localeCompare(a.date));
};
