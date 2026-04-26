import type { Macros, UserProfile } from "../types";

const ACTIVITY_MULTIPLIER: Record<UserProfile["activityType"], number> = {
  desk: 1.2,
  walk: 1.375,
  yoga: 1.45,
  home: 1.5,
  gym: 1.55,
  run: 1.7,
};

export const calculateTDEE = (profile: UserProfile): number => {
  const base =
    profile.gender === "male"
      ? 10 * profile.weight + 6.25 * profile.height - 5 * profile.age + 5
      : profile.gender === "female"
        ? 10 * profile.weight + 6.25 * profile.height - 5 * profile.age - 161
        : 10 * profile.weight + 6.25 * profile.height - 5 * profile.age - 78;

  const activityMultiplier = ACTIVITY_MULTIPLIER[profile.activityType] ?? 1.2;
  return Math.round(base * activityMultiplier);
};

export const calculateMacros = (
  tdee: number,
  goal: UserProfile["goal"],
): Macros => {
  const adjustedCalories =
    goal === "lose" ? tdee - 400 : goal === "gain" ? tdee + 300 : tdee;

  const safeCalories = Math.max(adjustedCalories, 1200);

  const ratios =
    goal === "lose"
      ? { protein: 0.35, carbs: 0.35, fat: 0.3 }
      : goal === "gain"
        ? { protein: 0.3, carbs: 0.45, fat: 0.25 }
        : { protein: 0.3, carbs: 0.4, fat: 0.3 };

  const protein = Math.round((safeCalories * ratios.protein) / 4);
  const carbs = Math.round((safeCalories * ratios.carbs) / 4);
  const fat = Math.round((safeCalories * ratios.fat) / 9);

  return {
    protein,
    carbs,
    fat,
    calories: safeCalories,
  };
};

export const calculateHydration = (
  weightKg: number,
  activityType: string,
): number => {
  const baselineMl = weightKg * 35;
  const activeTypes = new Set(["gym", "run", "home", "yoga"]);
  const activityBonusMl = activeTypes.has(activityType) ? 500 : 250;

  return Math.round(baselineMl + activityBonusMl);
};
