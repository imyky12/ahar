import axios, { type AxiosInstance } from "axios";
import { endOfWeek, getDay, startOfWeek, subWeeks } from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import { z } from "zod";

import { estimateCostUsd } from "../constants/aiPricing";

import { ActivityLogModel } from "../models/ActivityLog";
import { AuditLogModel } from "../models/AuditLog";
import { BadgeModel, getUserBadges } from "./badgeService";
import { DailyLogModel } from "../models/DailyLog";
import { GymLogModel } from "../models/GymLog";
import { UserProfileModel, type IUserProfile } from "../models/UserProfile";
import {
  WeeklyCheckinModel,
  type IWeeklyCheckin,
} from "../models/WeeklyCheckin";
import { WeightLogModel, type IWeightLog } from "../models/WeightLog";
import { logger } from "../utils/logger";
import { sendImmediateNotification } from "./notificationService";
import { getAllStreaks } from "./streakService";

const openAiEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
const openAiKey = process.env.AZURE_OPENAI_KEY;
const openAiDeployment = process.env.AZURE_OPENAI_DEPLOYMENT ?? "gpt-4o";
const openAiApiVersion = process.env.AZURE_OPENAI_API_VERSION ?? "2024-02-01";

const ensureAzureConfig = (): void => {
  if (!openAiEndpoint || !openAiKey) {
    throw new Error("Azure OpenAI environment variables are missing");
  }
};

const azureClient: AxiosInstance = axios.create({
  baseURL: openAiEndpoint,
  timeout: 30_000,
  headers: {
    "Content-Type": "application/json",
    "api-key": openAiKey,
  },
  params: {
    "api-version": openAiApiVersion,
  },
});

const weeklySummarySchema = z.object({
  headline: z.string(),
  score: z.number().min(0).max(100),
  wins: z.array(z.string()).min(1).max(4),
  improvements: z.array(z.string()).min(1).max(4),
  adjustments: z.array(z.string()).min(1).max(4),
  focusTip: z.string(),
  motivationalNote: z.string(),
  aiSummary: z.string(),
});

type WeeklySummaryResponse = z.infer<typeof weeklySummarySchema>;

interface WeeklyAggregateInput {
  weekStart: string;
  weekEnd: string;
  weight: number;
  sleepQualityAvg: number;
  mealComplianceRate: number;
  gymDaysTarget: number;
  gymDaysActual: number;
  avgSleepHours: number;
  avgEnergyLevel: number;
  waterGoalHitDays: number;
}

const average = (values: number[]): number => {
  if (!values.length) {
    return 0;
  }

  const total = values.reduce((sum, value) => sum + value, 0);
  return Number((total / values.length).toFixed(1));
};

const getWeekWindow = (
  timezone: string,
): { weekStart: string; weekEnd: string } => {
  const now = new Date();
  const localNowText = formatInTimeZone(now, timezone, "yyyy-MM-dd'T'HH:mm:ss");
  const localNow = new Date(localNowText);
  const target = subWeeks(localNow, 1);
  const start = startOfWeek(target, { weekStartsOn: 1 });
  const end = endOfWeek(target, { weekStartsOn: 1 });

  return {
    weekStart: formatInTimeZone(start, timezone, "yyyy-MM-dd"),
    weekEnd: formatInTimeZone(end, timezone, "yyyy-MM-dd"),
  };
};

const getGymTarget = (profile: IUserProfile): number => {
  if (profile.activityType === "gym" || profile.activityType === "run") {
    return 5;
  }

  if (profile.activityType === "home" || profile.activityType === "yoga") {
    return 4;
  }

  return 3;
};

const buildWeeklyAggregate = async (
  profile: IUserProfile,
  weight: number,
): Promise<WeeklyAggregateInput> => {
  const { weekStart, weekEnd } = getWeekWindow(profile.location.timezone);

  const [dailyLogs, gymLogs] = await Promise.all([
    DailyLogModel.find({
      userId: profile.userId,
      date: { $gte: weekStart, $lte: weekEnd },
      isDeleted: false,
    }).lean(),
    GymLogModel.find({
      userId: profile.userId,
      date: { $gte: weekStart, $lte: weekEnd },
      isDeleted: false,
    }).lean(),
  ]);

  const sleepQualityAvg = average(
    dailyLogs
      .map((entry) => entry.sleepQuality)
      .filter((value): value is number => typeof value === "number"),
  );

  const mealComplianceRate = average(
    dailyLogs
      .map((entry) => entry.macroCompliancePercent)
      .filter((value): value is number => typeof value === "number"),
  );

  const avgSleepHours = average(
    dailyLogs
      .map((entry) => entry.hoursSlept)
      .filter((value): value is number => typeof value === "number"),
  );

  const avgEnergyLevel = average(
    dailyLogs
      .map((entry) => entry.energyLevel)
      .filter((value): value is number => typeof value === "number"),
  );

  const waterGoalHitDays = dailyLogs.filter(
    (entry) => entry.waterIntakeMl >= profile.hydrationGoalMl,
  ).length;

  const uniqueGymDays = new Set(gymLogs.map((entry) => entry.date));

  return {
    weekStart,
    weekEnd,
    weight,
    sleepQualityAvg,
    mealComplianceRate,
    gymDaysTarget: getGymTarget(profile),
    gymDaysActual: uniqueGymDays.size,
    avgSleepHours,
    avgEnergyLevel,
    waterGoalHitDays,
  };
};

const buildPrompt = (
  profile: IUserProfile,
  aggregate: WeeklyAggregateInput,
  streaks: Array<{
    type: string;
    currentStreak: number;
    longestStreak: number;
  }>,
): string => {
  return [
    "You are a strict structured JSON wellness coach for Indian vegetarian users.",
    "Return only valid JSON with keys: headline, score, wins, improvements, adjustments, focusTip, motivationalNote, aiSummary.",
    "Do not return markdown.",
    `User goal: ${profile.goal}`,
    `Gender: ${profile.gender}`,
    `Chronic conditions: ${profile.dietPref.chronicConditions?.length ? profile.dietPref.chronicConditions.join(", ") : "none"}`,
    profile.gender === "female" && profile.female?.trackCycle
      ? `Menstrual tracking: enabled (cycle length: ${profile.female.cycleLength ?? 28} days)`
      : "Menstrual tracking: not applicable",
    `Week start: ${aggregate.weekStart}`,
    `Week end: ${aggregate.weekEnd}`,
    `Weight: ${aggregate.weight} kg`,
    `Sleep quality avg: ${aggregate.sleepQualityAvg}/10`,
    `Meal compliance: ${aggregate.mealComplianceRate}%`,
    `Gym days target/actual: ${aggregate.gymDaysTarget}/${aggregate.gymDaysActual}`,
    `Avg sleep hours: ${aggregate.avgSleepHours}`,
    `Avg energy level: ${aggregate.avgEnergyLevel}/5`,
    `Water-goal-hit days: ${aggregate.waterGoalHitDays}/7`,
    `Streaks: ${JSON.stringify(streaks)}`,
    "Personalise insights for the user's chronic conditions and gender. For women tracking their cycle, include recovery and nutrition advice appropriate to their phase.",
    "Tone: motivating, concise, practical, culturally relevant to Indian vegetarian diet.",
  ].join("\n");
};

const fallbackSummary = (
  aggregate: WeeklyAggregateInput,
): WeeklySummaryResponse => {
  const score = Math.max(
    30,
    Math.min(
      98,
      Math.round(
        aggregate.mealComplianceRate * 0.4 +
          (aggregate.gymDaysActual / Math.max(aggregate.gymDaysTarget, 1)) *
            25 +
          (aggregate.waterGoalHitDays / 7) * 20 +
          (aggregate.avgSleepHours / 8) * 15,
      ),
    ),
  );

  return {
    headline: "Steady progress, keep building momentum",
    score,
    wins: [
      `Meal consistency averaged ${aggregate.mealComplianceRate}% this week.`,
      `You completed ${aggregate.gymDaysActual} training day(s).`,
    ],
    improvements: [
      "Prioritise a fixed sleep window for better recovery.",
      "Push one extra hydration-goal day next week.",
    ],
    adjustments: [
      "Batch-cook one protein-rich dinner base twice weekly.",
      "Keep a mid-morning fruit + nuts fallback snack ready.",
    ],
    focusTip:
      "Anchor your day with water and protein at breakfast to reduce late-day cravings.",
    motivationalNote:
      "Consistency beats perfection. Small wins daily will compound by month-end.",
    aiSummary:
      "You are progressing well with room to improve sleep and hydration consistency.",
  };
};

const parseSummaryContent = (content: string): WeeklySummaryResponse => {
  const trimmed = content.trim();

  const tryParse = (value: string): WeeklySummaryResponse | null => {
    try {
      return weeklySummarySchema.parse(JSON.parse(value));
    } catch {
      return null;
    }
  };

  const direct = tryParse(trimmed);
  if (direct) {
    return direct;
  }

  const withoutFence = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  const fenced = tryParse(withoutFence);
  if (fenced) {
    return fenced;
  }

  const firstBrace = withoutFence.indexOf("{");
  const lastBrace = withoutFence.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const extracted = withoutFence.slice(firstBrace, lastBrace + 1);
    const parsed = tryParse(extracted);
    if (parsed) {
      return parsed;
    }
  }

  throw new Error("WEEKLY_SUMMARY_INVALID_JSON");
};

const requestAiSummary = async (
  userId: string,
  prompt: string,
): Promise<{
  summary: WeeklySummaryResponse;
  tokensUsed: number;
  rawResponse: string;
  durationMs: number;
}> => {
  ensureAzureConfig();
  const start = Date.now();
  const completionPath = `/openai/deployments/${openAiDeployment}/chat/completions`;
  const messages = [
    {
      role: "system",
      content:
        "You are AHAR weekly summary model. Return strict JSON only with no extra text.",
    },
    { role: "user", content: prompt },
  ];

  const postCompletion = async (useStrictJsonMode: boolean) => {
    return azureClient.post<{
      choices: Array<{ message: { content: string | null } }>;
      usage?: { total_tokens?: number };
    }>(completionPath, {
      messages,
      ...(useStrictJsonMode
        ? { response_format: { type: "json_object" as const } }
        : {}),
      temperature: 0.4,
      max_tokens: 700,
    });
  };

  let response;
  try {
    response = await postCompletion(true);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 400) {
      logger.warn(
        `Weekly summary strict JSON mode rejected for user=${userId}. Retrying without response_format.`,
      );
      response = await postCompletion(false);
    } else {
      throw error;
    }
  }

  const rawContent = response.data.choices[0]?.message.content ?? "";
  const parsed = parseSummaryContent(rawContent);

  return {
    summary: parsed,
    tokensUsed: response.data.usage?.total_tokens ?? 0,
    rawResponse: rawContent,
    durationMs: Date.now() - start,
  };
};

const upsertWeightLog = async (
  userId: string,
  date: string,
  weightKg: number,
  source: IWeightLog["source"],
): Promise<void> => {
  await WeightLogModel.findOneAndUpdate(
    { userId, date },
    {
      $set: {
        userId,
        date,
        weightKg,
        source,
        isDeleted: false,
      },
    },
    { upsert: true, setDefaultsOnInsert: true },
  );
};

export const generateWeeklySummaryForUser = async (
  userId: string,
  inputWeight?: number,
): Promise<IWeeklyCheckin> => {
  const profile = await UserProfileModel.findOne({
    userId,
    isDeleted: { $ne: true },
  });

  if (!profile) {
    throw new Error("PROFILE_NOT_FOUND");
  }

  const weight = inputWeight ?? profile.weight;
  const aggregate = await buildWeeklyAggregate(profile.toObject(), weight);

  const existing = await WeeklyCheckinModel.findOne({
    userId,
    weekStart: aggregate.weekStart,
    isDeleted: false,
  });

  if (existing?.status === "ready") {
    return existing.toObject();
  }

  const pending = await WeeklyCheckinModel.findOneAndUpdate(
    { userId, weekStart: aggregate.weekStart },
    {
      $set: {
        userId,
        weekStart: aggregate.weekStart,
        weekEnd: aggregate.weekEnd,
        weight: aggregate.weight,
        sleepQualityAvg: aggregate.sleepQualityAvg,
        mealComplianceRate: aggregate.mealComplianceRate,
        gymDays: aggregate.gymDaysTarget,
        gymDaysActual: aggregate.gymDaysActual,
        avgSleepHours: aggregate.avgSleepHours,
        avgEnergyLevel: aggregate.avgEnergyLevel,
        waterGoalHitDays: aggregate.waterGoalHitDays,
        status: "generating",
        isDeleted: false,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  if (!pending) {
    throw new Error("WEEKLY_CHECKIN_UPSERT_FAILED");
  }

  const streaks = await getAllStreaks(userId);
  const prompt = buildPrompt(
    profile.toObject(),
    aggregate,
    streaks.map((item) => ({
      type: item.type,
      currentStreak: item.currentStreak,
      longestStreak: item.longestStreak,
    })),
  );

  let summary: WeeklySummaryResponse = fallbackSummary(aggregate);
  let promptTokens = 0;
  let rawResponse = JSON.stringify(summary);
  let durationMs = 0;
  let success = false;
  let errorMessage = "";

  try {
    const aiResult = await requestAiSummary(userId, prompt);
    summary = aiResult.summary;
    promptTokens = aiResult.tokensUsed;
    rawResponse = aiResult.rawResponse;
    durationMs = aiResult.durationMs;
    success = true;
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "AI_SUMMARY_FAILED";
    logger.warn(
      `Weekly summary AI fallback for user=${userId}: ${errorMessage}`,
    );
  }

  await AuditLogModel.create({
    userId,
    action: "weekly_summary_generated",
    prompt,
    response: rawResponse,
    tokensUsed: promptTokens,
    costEstimateUsd: estimateCostUsd(promptTokens, 0),
    model: openAiDeployment,
    durationMs,
    success,
    errorMessage: success ? undefined : errorMessage,
    timestamp: new Date(),
  });

  const saved = await WeeklyCheckinModel.findOneAndUpdate(
    { userId, weekStart: aggregate.weekStart },
    {
      $set: {
        userId,
        weekStart: aggregate.weekStart,
        weekEnd: aggregate.weekEnd,
        weight: aggregate.weight,
        sleepQualityAvg: aggregate.sleepQualityAvg,
        mealComplianceRate: aggregate.mealComplianceRate,
        gymDays: aggregate.gymDaysTarget,
        gymDaysActual: aggregate.gymDaysActual,
        avgSleepHours: aggregate.avgSleepHours,
        avgEnergyLevel: aggregate.avgEnergyLevel,
        waterGoalHitDays: aggregate.waterGoalHitDays,
        headline: summary.headline,
        score: summary.score,
        wins: summary.wins,
        improvements: summary.improvements,
        adjustments: summary.adjustments,
        focusTip: summary.focusTip,
        motivationalNote: summary.motivationalNote,
        aiSummary: summary.aiSummary,
        aiPromptTokens: promptTokens,
        status: "ready",
        generatedAt: new Date(),
        isDeleted: false,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  if (!saved) {
    throw new Error("WEEKLY_CHECKIN_SAVE_FAILED");
  }

  await upsertWeightLog(
    userId,
    aggregate.weekEnd,
    aggregate.weight,
    "weekly_checkin",
  );

  await ActivityLogModel.create({
    userId,
    action: "weekly_summary_generated",
    metadata: {
      weekStart: aggregate.weekStart,
      weekEnd: aggregate.weekEnd,
      score: summary.score,
      usedFallback: !success,
    },
    timestamp: new Date(),
  });

  await sendImmediateNotification({
    userId,
    type: "weekly_checkin",
    title: "Weekly report is ready 📈",
    body: "Your new progress summary is available in the Progress tab.",
    data: { screen: "progress", action: "weekly_summary_ready" },
    sound: "chime",
    priority: "normal",
  });

  return saved.toObject();
};

export const runWeeklySummaryCron = async (): Promise<void> => {
  const profiles = await UserProfileModel.find({
    isDeleted: { $ne: true },
    isOnboardingComplete: true,
  }).lean();

  const now = new Date();

  for (const profile of profiles) {
    try {
      const zonedNow = toZonedTime(now, profile.location.timezone);
      const day = getDay(zonedNow); // 0 = Sunday
      const hour = zonedNow.getHours();
      const minute = zonedNow.getMinutes();

      if (day !== 0 || hour !== 20 || minute !== 0) {
        continue;
      }

      await generateWeeklySummaryForUser(profile.userId);
    } catch (error) {
      logger.error(
        `Weekly summary cron failed for user=${profile.userId}: ${String(error)}`,
      );
    }
  }
};

export const getProgressStats = async (userId: string) => {
  const [weeklyCheckins, weightLogs, badges, streaks] = await Promise.all([
    WeeklyCheckinModel.find({ userId, isDeleted: false })
      .sort({ weekStart: -1 })
      .limit(12)
      .lean(),
    WeightLogModel.find({ userId, isDeleted: false })
      .sort({ date: -1 })
      .limit(20)
      .lean(),
    getUserBadges(userId),
    getAllStreaks(userId),
  ]);

  const newest = weeklyCheckins[0];
  const oldest = weeklyCheckins[weeklyCheckins.length - 1];
  const scoreDelta =
    newest && oldest ? Number((newest.score - oldest.score).toFixed(1)) : 0;

  const latestWeight = weightLogs[0]?.weightKg ?? newest?.weight ?? null;
  const firstWeight =
    weightLogs[weightLogs.length - 1]?.weightKg ?? oldest?.weight ?? null;
  const weightChangeKg =
    typeof latestWeight === "number" && typeof firstWeight === "number"
      ? Number((latestWeight - firstWeight).toFixed(1))
      : 0;

  return {
    currentWeek: newest ?? null,
    weeklyHistory: [...weeklyCheckins].reverse(),
    weightLogs: [...weightLogs].reverse(),
    streaks,
    badges,
    summary: {
      scoreDelta,
      weightChangeKg,
      badgesEarned: badges.length,
      newBadges: badges.filter((badge) => badge.isNew).length,
    },
  };
};

export const markBadgesSeen = async (userId: string): Promise<number> => {
  const result = await BadgeModel.updateMany(
    { userId, isDeleted: false, isNew: true },
    { $set: { isNew: false } },
  );

  return result.modifiedCount;
};

export const getWeeklySummaryByRange = async (
  userId: string,
  weekStart: string,
  weekEnd: string,
): Promise<IWeeklyCheckin | null> => {
  const checkin = await WeeklyCheckinModel.findOne({
    userId,
    weekStart,
    weekEnd,
    isDeleted: false,
  }).lean();

  return checkin ?? null;
};

export const getWeeklySummaryByDate = async (
  userId: string,
  date: string,
): Promise<IWeeklyCheckin | null> => {
  const checkin = await WeeklyCheckinModel.findOne({
    userId,
    weekStart: { $lte: date },
    weekEnd: { $gte: date },
    isDeleted: false,
  }).lean();

  return checkin ?? null;
};

export const saveManualWeightLog = async (
  userId: string,
  payload: Pick<
    IWeightLog,
    "date" | "weightKg" | "bodyFatPercent" | "muscleMassKg" | "notes"
  >,
): Promise<IWeightLog> => {
  const saved = await WeightLogModel.findOneAndUpdate(
    { userId, date: payload.date },
    {
      $set: {
        userId,
        date: payload.date,
        weightKg: payload.weightKg,
        bodyFatPercent: payload.bodyFatPercent,
        muscleMassKg: payload.muscleMassKg,
        notes: payload.notes,
        source: "manual",
        isDeleted: false,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  if (!saved) {
    throw new Error("WEIGHT_LOG_SAVE_FAILED");
  }

  return saved.toObject();
};

export const shouldRecalculateForWeightChange = (
  currentWeight: number,
  nextWeight: number,
): boolean => {
  return Math.abs(currentWeight - nextWeight) >= 2;
};

export const calculateNutritionTargets = (
  profile: Pick<
    IUserProfile,
    "gender" | "weight" | "height" | "age" | "activityType" | "goal"
  >,
) => {
  const activityMultiplier: Record<IUserProfile["activityType"], number> = {
    desk: 1.2,
    walk: 1.375,
    yoga: 1.45,
    home: 1.5,
    gym: 1.55,
    run: 1.7,
  };

  const bmr =
    profile.gender === "male"
      ? 10 * profile.weight + 6.25 * profile.height - 5 * profile.age + 5
      : profile.gender === "female"
        ? 10 * profile.weight + 6.25 * profile.height - 5 * profile.age - 161
        : 10 * profile.weight + 6.25 * profile.height - 5 * profile.age - 78;

  const tdee = Math.round(
    bmr * (activityMultiplier[profile.activityType] ?? 1.2),
  );
  const adjustedCalories =
    profile.goal === "lose"
      ? tdee - 400
      : profile.goal === "gain"
        ? tdee + 300
        : tdee;
  const safeCalories = Math.max(adjustedCalories, 1200);

  const ratios =
    profile.goal === "lose"
      ? { protein: 0.35, carbs: 0.35, fat: 0.3 }
      : profile.goal === "gain"
        ? { protein: 0.3, carbs: 0.45, fat: 0.25 }
        : { protein: 0.3, carbs: 0.4, fat: 0.3 };

  const hydrationGoalMl = Math.round(
    profile.weight * 35 +
      (new Set(["gym", "run", "home", "yoga"]).has(profile.activityType)
        ? 500
        : 250),
  );

  return {
    tdee,
    hydrationGoalMl,
    macros: {
      protein: Math.round((safeCalories * ratios.protein) / 4),
      carbs: Math.round((safeCalories * ratios.carbs) / 4),
      fat: Math.round((safeCalories * ratios.fat) / 9),
      calories: safeCalories,
    },
  };
};

export const localWeekStartDateToUtc = (
  weekStart: string,
  timezone: string,
): Date => {
  return fromZonedTime(`${weekStart}T00:00:00`, timezone);
};
