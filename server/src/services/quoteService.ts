import axios, { type AxiosInstance } from "axios";
import { formatInTimeZone } from "date-fns-tz";

import { AuditLogModel } from "../models/AuditLog";
import { DailyQuoteModel, type IDailyQuote, type QuoteCategory } from "../models/DailyQuote";
import { UserNotificationSettingsModel } from "../models/UserNotificationSettings";
import { UserProfileModel } from "../models/UserProfile";
import { logger } from "../utils/logger";

// ─── Azure client ────────────────────────────────────────────────────────────

const openAiEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
const openAiKey = process.env.AZURE_OPENAI_KEY;
const openAiDeployment = process.env.AZURE_OPENAI_DEPLOYMENT ?? "gpt-4o";
const openAiApiVersion = process.env.AZURE_OPENAI_API_VERSION ?? "2024-02-01";

const azureClient: AxiosInstance = axios.create({
  baseURL: openAiEndpoint,
  timeout: 20_000,
  headers: { "Content-Type": "application/json", "api-key": openAiKey },
  params: { "api-version": openAiApiVersion },
});

// ─── Category metadata ───────────────────────────────────────────────────────

const CATEGORY_META: Record<
  QuoteCategory,
  { notificationTitle: string; systemInstruction: string }
> = {
  motivational: {
    notificationTitle: "Today's motivation ✨",
    systemInstruction:
      "You are a wellness coach. Write one short, genuinely motivating quote (max 18 words) for an Indian professional working on their health. Make it feel personal, not generic. Return only valid JSON: {\"text\":\"...\",\"author\":\"AHAR\"}",
  },
  funny: {
    notificationTitle: "Morning laugh 😄",
    systemInstruction:
      "You are a witty health coach. Write one short, light-hearted funny quote (max 18 words) about healthy eating, exercise, or sleep — relatable to an Indian urban professional. Slightly self-deprecating humour works great. Return only valid JSON: {\"text\":\"...\",\"author\":\"AHAR\"}",
  },
  fitness: {
    notificationTitle: "Fitness fuel 💪",
    systemInstruction:
      "You are a fitness coach. Write one sharp, energising fitness quote (max 18 words) relevant to gym-goers or home workout enthusiasts in India. Return only valid JSON: {\"text\":\"...\",\"author\":\"AHAR\"}",
  },
  mindfulness: {
    notificationTitle: "Mindful moment 🧘",
    systemInstruction:
      "You are a mindfulness coach. Write one calm, reflective mindfulness quote (max 18 words) that helps an Indian professional pause and breathe. No clichés. Return only valid JSON: {\"text\":\"...\",\"author\":\"AHAR\"}",
  },
};

// ─── Fallback quotes (used when AI is unavailable) ───────────────────────────

const FALLBACKS: Record<QuoteCategory, string[]> = {
  motivational: [
    "Small daily wins build unstoppable momentum.",
    "Consistency beats intensity when life gets busy.",
    "Your next healthy choice matters more than your last mistake.",
    "Fuel your body like it carries your dreams.",
    "Keep promises to yourself.",
  ],
  funny: [
    "I have a love-hate relationship with dal. I love eating it, I hate making it.",
    "My fitness goal: be able to carry all grocery bags in one trip.",
    "Sleep is the only gym session I never skip.",
    "My body is a temple. Right now it is under renovation.",
    "Running late counts as cardio, right?",
  ],
  fitness: [
    "Strength grows in the routine you protect.",
    "A 10-minute workout still counts.",
    "Train your mind and your body will follow.",
    "Nutrition is training too.",
    "Discomfort today becomes confidence tomorrow.",
  ],
  mindfulness: [
    "Breathe. You have handled every hard day so far.",
    "One conscious meal at a time.",
    "Rest is productive when it helps you recover.",
    "A calm mind supports a strong body.",
    "Progress is personal. Stay in your lane.",
  ],
};

const getFallback = (category: QuoteCategory, chunkIndex: number): Pick<IDailyQuote, "text" | "author"> => {
  const pool = FALLBACKS[category];
  return { text: pool[chunkIndex % pool.length] as string, author: "AHAR" };
};

// ─── AI generation ───────────────────────────────────────────────────────────

interface RawQuote { text: string; author: string }

const generateQuoteWithAi = async (
  category: QuoteCategory,
  chunkIndex: number,
  date: string,
): Promise<RawQuote> => {
  if (!openAiEndpoint || !openAiKey) {
    return getFallback(category, chunkIndex);
  }

  const meta = CATEGORY_META[category];
  const start = Date.now();
  let tokensUsed = 0;

  try {
    const response = await azureClient.post<{
      choices: Array<{ message: { content: string | null } }>;
      usage?: { total_tokens?: number };
    }>(
      `/openai/deployments/${openAiDeployment}/chat/completions`,
      {
        messages: [
          { role: "system", content: meta.systemInstruction },
          {
            role: "user",
            content: `Generate quote #${chunkIndex + 1} for ${date}. Be unique — avoid repeating phrases from previous quotes.`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.9,  // high temp for variety
        max_tokens: 80,
      },
    );

    tokensUsed = response.data.usage?.total_tokens ?? 0;
    const raw = response.data.choices[0]?.message.content ?? "";
    const parsed = JSON.parse(raw) as { text?: string; author?: string };

    if (!parsed.text || typeof parsed.text !== "string") {
      throw new Error("Invalid AI quote response shape");
    }

    await AuditLogModel.create({
      userId: "system",
      action: "daily_quote_generated",
      prompt: `category=${category} chunk=${chunkIndex} date=${date}`,
      response: raw,
      tokensUsed,
      costEstimateUsd: Number((tokensUsed * 0.000005).toFixed(6)),
      model: openAiDeployment,
      durationMs: Date.now() - start,
      success: true,
      timestamp: new Date(),
    });

    return { text: parsed.text.trim(), author: parsed.author ?? "AHAR" };
  } catch (error) {
    logger.warn(
      `AI quote generation failed for category=${category} chunk=${chunkIndex}: ${String(error)}`,
    );

    await AuditLogModel.create({
      userId: "system",
      action: "daily_quote_generated",
      prompt: `category=${category} chunk=${chunkIndex} date=${date}`,
      response: "",
      tokensUsed,
      costEstimateUsd: 0,
      model: openAiDeployment,
      durationMs: Date.now() - start,
      success: false,
      errorMessage: String(error),
      timestamp: new Date(),
    });

    return getFallback(category, chunkIndex);
  }
};

// ─── Chunk calculation ────────────────────────────────────────────────────────

/**
 * Derive a stable chunk index for a userId.
 * Chunk size = ceil(sqrt(totalUsers)), capped at 10.
 * Two users → 2 chunks (each unique).
 * 20 users → chunks of ~4-5 users each.
 * 100 users → ~10 chunks.
 */
export const getChunkIndex = (userId: string, totalUsers: number): number => {
  const chunkCount = Math.min(10, Math.max(1, Math.ceil(Math.sqrt(totalUsers))));
  const hash = userId
    .split("")
    .reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) >>> 0, 0);
  return hash % chunkCount;
};

export const getChunkCount = (totalUsers: number): number =>
  Math.min(10, Math.max(1, Math.ceil(Math.sqrt(totalUsers))));

// ─── Cache read / write ───────────────────────────────────────────────────────

const getOrGenerateQuote = async (
  date: string,
  category: QuoteCategory,
  chunkIndex: number,
): Promise<IDailyQuote> => {
  const cached = await DailyQuoteModel.findOne({
    date,
    category,
    chunkIndex,
  }).lean();

  if (cached) return cached;

  const raw = await generateQuoteWithAi(category, chunkIndex, date);
  const meta = CATEGORY_META[category];

  const doc = await DailyQuoteModel.findOneAndUpdate(
    { date, category, chunkIndex },
    {
      $setOnInsert: {
        date,
        category,
        chunkIndex,
        text: raw.text,
        author: raw.author,
        notificationTitle: meta.notificationTitle,
        generatedAt: new Date(),
      },
    },
    { upsert: true, new: true },
  );

  return doc!;
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Get today's quote for a specific user.
 * Resolves their quotePreference from UserNotificationSettings,
 * derives their chunk index, and returns the cached (or freshly generated) quote.
 */
export const getQuoteForUser = async (
  userId: string,
  date: string,
): Promise<IDailyQuote> => {
  const [settings, totalUsers] = await Promise.all([
    UserNotificationSettingsModel.findOne({ userId }).lean(),
    UserProfileModel.countDocuments({ isDeleted: { $ne: true }, isOnboardingComplete: true }),
  ]);

  const preference = (settings as { quotePreference?: string } | null)?.quotePreference ?? "motivational";
  const chunkIndex = getChunkIndex(userId, totalUsers || 1);

  // "mixed" rotates through all four categories based on day-of-year
  const dayOfYear = Math.floor(
    (new Date(date).getTime() - new Date(`${date.slice(0, 4)}-01-01`).getTime()) /
      86_400_000,
  );
  const allCategories: QuoteCategory[] = ["motivational", "funny", "fitness", "mindfulness"];
  const category: QuoteCategory =
    preference === "mixed"
      ? (allCategories[dayOfYear % 4] as QuoteCategory)
      : (preference as QuoteCategory) in CATEGORY_META
        ? (preference as QuoteCategory)
        : "motivational";

  return getOrGenerateQuote(date, category, chunkIndex);
};

/**
 * Pre-generate all quotes for a given date.
 * Called at 6 am daily so cache is warm before morning notifications fire.
 * Generates: 4 categories × chunkCount quotes = max 40 AI calls/day.
 */
export const pregenerateQuotesForDate = async (date: string): Promise<void> => {
  const totalUsers = await UserProfileModel.countDocuments({
    isDeleted: { $ne: true },
    isOnboardingComplete: true,
  });

  if (totalUsers === 0) return;

  const chunkCount = getChunkCount(totalUsers);
  const categories: QuoteCategory[] = ["motivational", "funny", "fitness", "mindfulness"];

  for (const category of categories) {
    for (let chunkIndex = 0; chunkIndex < chunkCount; chunkIndex++) {
      try {
        await getOrGenerateQuote(date, category, chunkIndex);
      } catch (error) {
        logger.error(
          `Quote pregeneration failed date=${date} category=${category} chunk=${chunkIndex}: ${String(error)}`,
        );
      }
    }
  }

  logger.info(
    `Quotes pregenerated for ${date}: ${chunkCount} chunks × 4 categories`,
  );
};

/**
 * Get today's quote for use in a push notification.
 * Returns the full IDailyQuote including notificationTitle.
 */
export const getQuoteForNotification = async (
  userId: string,
  date: string,
): Promise<IDailyQuote> => getQuoteForUser(userId, date);

/**
 * Resolve a user's local date from their profile timezone.
 */
export const getLocalDateForUser = (timezone: string): string =>
  formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");
