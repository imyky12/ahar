import axios, { AxiosError, type AxiosInstance } from "axios";
import { format, subDays } from "date-fns";
import { z } from "zod";

import { estimateCostUsd } from "../constants/aiPricing";
import { ActivityLogModel } from "../models/ActivityLog";
import { AuditLogModel } from "../models/AuditLog";
import {
  DietPlanModel,
  type IDietPlan,
  type IFoodItem,
  type IMacros,
} from "../models/DietPlan";
import { DailyLogModel } from "../models/DailyLog";
import { GroceryListModel } from "../models/GroceryList";
import { GymLogModel } from "../models/GymLog";
import { MealLogModel } from "../models/MealLog";
import { MedicineReminderModel } from "../models/MedicineReminder";
import { PrepTaskModel } from "../models/PrepTask";
import { UserProfileModel } from "../models/UserProfile";
import { logger } from "../utils/logger";
import { awardBadge } from "./badgeService";
import {
  getFestivalDietGuidelines,
  getTodaysFestival,
} from "./festivalService";

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

const macrosSchema = z.object({
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
  calories: z.number(),
});

const generatedPlanSchema = z.object({
  planType: z.enum(["regular", "festival", "fasting", "rest"]),
  festivalName: z.string().nullable(),
  totalMacros: macrosSchema,
  meals: z.array(
    z.object({
      id: z.string(),
      timeSlot: z.string(),
      label: z.string(),
      items: z.array(
        z.object({
          name: z.string(),
          quantity: z.string(),
          unit: z.string(),
          macros: macrosSchema,
          cookTimeMinutes: z.number(),
        }),
      ),
      totalMacros: macrosSchema,
      prepTimeMinutes: z.number(),
    }),
  ),
  groceryList: z.array(
    z.object({
      name: z.string(),
      quantity: z.string(),
      unit: z.string(),
    }),
  ),
  prepTasks: z.array(
    z.object({
      id: z.string(),
      instruction: z.string(),
      scheduledFor: z.string(),
      type: z.enum(["soak", "marinate", "defrost", "other"]),
    }),
  ),
});

const alternativesSchema = z.object({
  alternatives: z.array(
    z.object({
      items: z.array(
        z.object({
          name: z.string(),
          quantity: z.string(),
          unit: z.string(),
          macros: macrosSchema,
          cookTimeMinutes: z.number(),
        }),
      ),
      prepTimeMinutes: z.number(),
      label: z.string(),
      totalMacros: macrosSchema,
    }),
  ),
});

interface ChatCompletionResponse {
  choices: Array<{
    message: {
      content: string | Array<{ type?: string; text?: string }> | null;
    };
  }>;
  usage?: {
    total_tokens?: number;
    prompt_tokens?: number;
    completion_tokens?: number;
  };
}

const toContentString = (
  content: string | Array<{ type?: string; text?: string }> | null,
): string => {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => item.text ?? "")
      .join("\n")
      .trim();
  }

  return "";
};

const calculateBmi = (weight: number, heightCm: number): number => {
  const heightM = heightCm / 100;
  if (!heightM) {
    return 0;
  }

  return Number((weight / (heightM * heightM)).toFixed(1));
};

const getSeasonForLocation = (country: string, month: number): string => {
  const c = country.toLowerCase();
  // India and South Asian tropical season logic
  if (["india", "bangladesh", "pakistan", "sri lanka", "nepal"].includes(c)) {
    if (month >= 3 && month <= 5) return "summer";
    if (month >= 6 && month <= 9) return "monsoon";
    if (month >= 10 && month <= 11) return "post-monsoon";
    return "winter";
  }
  // Northern hemisphere default
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
};

const SEASON_GUIDANCE: Record<string, string> = {
  summer:
    "Hot weather: include cooling foods (cucumber raita, kokum sherbet, buttermilk, mint, watermelon). Increase hydration goal. Avoid heavy oily meals. Light, easily digestible foods preferred. Eating times should avoid peak heat (12-15:00 for heavy meals).",
  monsoon:
    "Monsoon season: avoid raw salads and street-style foods (hygiene risk). Prefer cooked vegetables. Include immunity-boosting foods (turmeric, ginger, tulsi, pepper). Avoid excessive dairy and fish-like items in humid conditions.",
  winter:
    "Cold weather: warming foods (ginger, garlic, sesame, til laddoo, bajra roti, sarson da saag, gajar halwa). Calorie needs may be slightly higher. Root vegetables and warming spices recommended.",
  spring:
    "Spring: light, fresh seasonal produce. Detox-supportive foods (amla, neem, turmeric). Transition from heavier winter diet to lighter meals.",
  autumn:
    "Autumn/post-monsoon: grounding foods (root vegetables, pumpkin, sesame). Include warming spices. Good season for heavier proteins.",
  "post-monsoon":
    "Post-monsoon: transition to warming foods. Immunity focus continues. Include seasonal vegetables like gajar, matar, methi.",
};

const CONDITION_RULES: Record<string, string> = {
  diabetes:
    "Low GI meals only (GI < 55). No white rice — use brown rice, millets, or quinoa. No added sugar, fruit juice, or refined flour. Pair carbs with protein/fat at every meal to blunt glucose spikes. Include fenugreek seeds, bitter gourd, and cinnamon where possible. Limit portion size of starchy vegetables.",
  "high blood pressure":
    "Strict low-sodium diet: no pickles, papads, namkeen, processed foods. Prefer potassium-rich foods (banana, sweet potato, spinach). Include flaxseeds and walnuts for omega-3. Avoid excess caffeine. Use herbs for flavour instead of salt.",
  thyroid:
    "Avoid raw cruciferous vegetables (cabbage, broccoli, cauliflower) — cook them instead. Include selenium-rich foods (Brazil nuts, sunflower seeds). Ensure adequate iodine (iodised salt, seaweed occasionally). Include zinc-rich foods (pumpkin seeds, chickpeas). Time meals consistently to support medication absorption.",
  pcod:
    "Low-carb, anti-inflammatory focus. Prioritise complex carbs (oats, millets, quinoa). Include omega-3 (flaxseeds, walnuts, chia). Anti-androgenic foods: spearmint tea, soy in moderation. Avoid refined sugar, processed foods, trans fats. Space meals evenly to maintain insulin sensitivity.",
  pcos:
    "Low-carb, anti-inflammatory focus. Prioritise complex carbs (oats, millets, quinoa). Include omega-3 (flaxseeds, walnuts, chia). Anti-androgenic foods: spearmint tea, soy in moderation. Avoid refined sugar, processed foods, trans fats. Space meals evenly to maintain insulin sensitivity.",
  anemia:
    "High iron-rich foods at every meal: spinach, lentils, rajma, dates, jaggery, tofu. Pair iron sources with vitamin C (lemon, amla, tomato) for absorption. Avoid tea/coffee within 1 hour of meals — they inhibit iron absorption. Include folate (leafy greens, legumes) and vitamin B12 (dairy, fortified foods).",
  "ibs (irritable bowel syndrome)":
    "Low-FODMAP approach. Avoid onion, garlic (use asafoetida/hing as substitute), wheat, beans, lactose. Prefer easily digestible foods: rice, oats, banana, carrot, zucchini, lactose-free dairy. Small frequent meals. No spicy foods. Avoid caffeine and carbonated drinks.",
  "acid reflux":
    "Avoid acidic, spicy, and fatty foods. No tomatoes, citrus, mint, chocolate, coffee. Eat small frequent meals. Last meal at least 3 hours before bedtime. Include alkaline foods (cucumber, melon, oats, ginger). Avoid lying down after meals.",
  "lactose intolerance":
    "Avoid milk and fresh paneer. Use lactose-free milk, curd (tolerated by most), coconut milk, or plant-based alternatives. Ensure calcium from non-dairy sources: ragi, sesame seeds, tofu, fortified plant milk, dark leafy greens.",
  "celiac disease":
    "Strictly gluten-free: no wheat, barley, rye, semolina (sooji), maida. Use rice, millet (bajra, jowar, ragi), quinoa, amaranth instead. Avoid cross-contamination. Choose naturally gluten-free Indian dishes.",
  "kidney disease":
    "Low potassium, low phosphorus, low sodium. Limit high-potassium foods: banana, potato, tomato, spinach — use in small quantities. Avoid phosphorus-rich foods: nuts, seeds, dairy in excess. Restrict protein to prescribed amount. No processed foods. Boil and discard cooking water for vegetables to reduce potassium.",
  "fatty liver":
    "No fried foods, no trans fats, no alcohol. Low-sugar, high-fibre diet. Include liver-supportive foods: beetroot, carrot, green tea, garlic, turmeric. Prefer healthy fats (olive oil, flaxseed). Increase cruciferous vegetables (cooked). Limit fructose.",
  osteoporosis:
    "High calcium: ragi, sesame seeds, dark leafy greens, curd, paneer. Vitamin D support: fortified foods, mushrooms. Magnesium (almonds, dark chocolate). Reduce excess sodium and caffeine (leach calcium). Weight-bearing exercise meals: pre-workout protein, post-workout calcium.",
  insomnia:
    "Tryptophan-rich foods for dinner: milk, banana, almonds, turkey seeds. Magnesium-rich foods: pumpkin seeds, spinach, dark chocolate. No caffeine after 14:00 (tea, coffee, chocolate). Light dinner 3 hours before sleep. Include complex carbs at dinner to aid serotonin production.",
  migraine:
    "Avoid common triggers: aged cheese, chocolate, citrus, onions, processed meats, artificial sweeteners, MSG. Regular meal timing — never skip meals. Stay well hydrated. Include magnesium-rich foods (almonds, spinach). Avoid caffeine dependency but taper gradually if reducing.",
  "heart disease":
    "Heart-healthy diet: omega-3 (flaxseeds, walnuts, chia), soluble fibre (oats, beans, psyllium husk). No trans fats, minimal saturated fats. Low sodium. Include plant sterols. Antioxidant-rich foods (berries, dark leafy greens, turmeric). Limit refined carbs.",
  "vitamin d deficiency":
    "Include vitamin D foods: fortified milk, mushrooms, egg yolk (if allowed), fortified cereals. Pair with healthy fat for absorption. Include calcium-rich foods alongside (ragi, dark leafy greens, curd). Encourage outdoor meals when possible.",
  "vitamin b12 deficiency":
    "High B12 foods: dairy (milk, curd, paneer, cheese), fortified foods. Include nutritional yeast if available. B12 is mainly in animal products — for vegetarians, fortified foods and dairy are essential. Mention importance of supplementation if diet is insufficient.",
  "iron deficiency":
    "Same as anemia: iron-rich foods at every meal with vitamin C, avoid tea/coffee with meals.",
  "thyroid (hypothyroid)":
    "Same as thyroid guidelines. Additionally, avoid soy products as they can interfere with levothyroxine absorption if taken within 4 hours of medication.",
  "thyroid (hyperthyroid)":
    "Limit iodine-rich foods (seaweed, iodised salt in excess). Include anti-thyroid foods: cruciferous vegetables (cooked), millet, soy. High-calorie diet if weight loss is occurring. Include calcium and vitamin D.",
  "high cholesterol":
    "Reduce saturated fats (ghee, coconut oil, fried foods). Increase soluble fibre (oats, flaxseeds, beans, psyllium). Include plant sterols (walnuts, flaxseed). No trans fats. Prefer monounsaturated fats (olive oil). Include garlic and turmeric for cholesterol management.",
};

const buildConditionConstraints = (conditions: string[]): string => {
  if (!conditions.length) return "";
  const rules = conditions
    .map((c) => {
      const key = c.toLowerCase().trim();
      const rule = CONDITION_RULES[key];
      return rule ? `- ${c}: ${rule}` : null;
    })
    .filter(Boolean);
  return rules.length
    ? `CONDITION-SPECIFIC DIETARY RULES (MANDATORY):\n${rules.join("\n")}`
    : "";
};

const MENSTRUAL_PHASE_GUIDANCE: Record<string, string> = {
  menstrual:
    "User is in menstrual phase (days 1-5). Prioritise iron-rich foods (spinach, lentils, rajma, dates, jaggery) and vitamin C sources to aid iron absorption. Include anti-cramp foods (magnesium from pumpkin seeds, dark chocolate). Avoid raw cruciferous vegetables and excess salt. Keep meals warm and easy to digest. Slightly reduce portion size if appetite is low.",
  follicular:
    "User is in follicular phase (days 6-13). Energy is rising. Include fermented and fibre-rich foods (idli, dosa, curd, sprouts) to support oestrogen metabolism. Good phase for higher-intensity gym workouts — ensure adequate protein and complex carbs around workout.",
  ovulation:
    "User is in ovulation phase (days 14-16). Anti-inflammatory focus: turmeric, ginger, flaxseeds, berries. Include zinc-rich foods (pumpkin seeds, chickpeas). Avoid excess processed sugar and fried foods.",
  luteal:
    "User is in luteal phase (days 17-end). Add 100-200 extra kcal via complex carbs (sweet potato, oats, brown rice) to manage PMS cravings. Magnesium (dark chocolate, almonds, spinach) reduces bloating and mood swings. Limit caffeine and alcohol. B6-rich foods (bananas, chickpeas) support mood.",
};

const determineMenstrualPhase = (
  lastPeriodDate?: Date,
  cycleLength = 28,
): "menstrual" | "follicular" | "ovulation" | "luteal" | "not applicable" => {
  if (!lastPeriodDate) {
    return "not applicable";
  }

  const today = new Date();
  const daysSince = Math.max(
    1,
    Math.floor(
      (today.getTime() - lastPeriodDate.getTime()) / (1000 * 60 * 60 * 24),
    ) + 1,
  );
  const cycleDay = ((daysSince - 1) % cycleLength) + 1;

  if (cycleDay >= 1 && cycleDay <= 5) {
    return "menstrual";
  }

  if (cycleDay >= 6 && cycleDay <= 13) {
    return "follicular";
  }

  if (cycleDay >= 14 && cycleDay <= 16) {
    return "ovulation";
  }

  return "luteal";
};

const fallbackItems = {
  breakfast: {
    name: "Oats with milk and banana",
    quantity: "1",
    unit: "bowl",
    macros: { protein: 14, carbs: 58, fat: 9, calories: 360 },
    cookTimeMinutes: 10,
  },
  midMorning: {
    name: "Mixed fruits",
    quantity: "1",
    unit: "bowl",
    macros: { protein: 3, carbs: 28, fat: 1, calories: 130 },
    cookTimeMinutes: 5,
  },
  lunch: {
    name: "Dal rice with vegetables",
    quantity: "1",
    unit: "plate",
    macros: { protein: 20, carbs: 72, fat: 12, calories: 480 },
    cookTimeMinutes: 20,
  },
  evening: {
    name: "Sprouts chaat",
    quantity: "1",
    unit: "bowl",
    macros: { protein: 14, carbs: 24, fat: 5, calories: 210 },
    cookTimeMinutes: 10,
  },
  dinner: {
    name: "Roti with sabzi and curd",
    quantity: "1",
    unit: "plate",
    macros: { protein: 19, carbs: 52, fat: 13, calories: 410 },
    cookTimeMinutes: 20,
  },
} as const;

// Keywords in item/grocery names that an allergen group triggers removal of
const ALLERGEN_KEYWORDS: Record<string, string[]> = {
  gluten:   ["roti", "atta", "wheat", "oats", "bread", "naan", "paratha", "chapati"],
  dairy:    ["milk", "curd", "paneer", "ghee", "butter", "cheese", "whey", "yogurt"],
  nuts:     ["almond", "cashew", "walnut", "peanut", "groundnut", "nut"],
  soy:      ["soy", "tofu", "edamame"],
  legumes:  ["dal", "lentil", "chana", "rajma", "moong", "sprout", "bean"],
};

// Conditions that require item removal keyed by condition slug
const CONDITION_KEYWORDS: Record<string, string[]> = {
  celiac:    ["roti", "atta", "wheat", "oats", "bread"],
  gout:      ["dal", "lentil", "chana", "rajma", "moong", "sprout", "bean"],
  ibs:       ["sprout", "dal", "lentil", "bean"],
};

// Safe gluten-free dinner alternative for celiac / gluten allergy
const glutenFreeDinner = {
  name: "Rice with dal and sabzi",
  quantity: "1",
  unit: "plate",
  macros: { protein: 17, carbs: 58, fat: 9, calories: 390 },
  cookTimeMinutes: 20,
};

// Safe oat-free breakfast for celiac / gluten allergy
const glutenFreeBreakfast = {
  name: "Poha with peanuts and vegetables",
  quantity: "1",
  unit: "bowl",
  macros: { protein: 11, carbs: 52, fat: 8, calories: 330 },
  cookTimeMinutes: 10,
};

const createFallbackPlan = (
  userId: string,
  date: string,
  target: IMacros,
  errorMessage: string,
  chronicConditions: string[],
  allergies: string[],
): Omit<IDietPlan, "_id" | "createdAt" | "updatedAt"> => {
  const allergyLower = allergies.map((a) => a.toLowerCase());
  const conditionLower = chronicConditions.map((c) => c.toLowerCase());

  const isUnsafe = (name: string): boolean => {
    const nameLower = name.toLowerCase();

    for (const allergen of allergyLower) {
      const keywords = ALLERGEN_KEYWORDS[allergen] ?? [allergen];
      if (keywords.some((kw) => nameLower.includes(kw))) {
        return true;
      }
    }

    for (const condition of conditionLower) {
      const keywords = CONDITION_KEYWORDS[condition];
      if (keywords?.some((kw) => nameLower.includes(kw))) {
        return true;
      }
    }

    return false;
  };

  const needsGlutenFree =
    allergyLower.includes("gluten") ||
    conditionLower.includes("celiac");

  const breakfastItem = needsGlutenFree ? glutenFreeBreakfast : fallbackItems.breakfast;
  const dinnerItem = needsGlutenFree ? glutenFreeDinner : fallbackItems.dinner;

  const meals = [
    {
      id: `${date}_meal_1`,
      timeSlot: "08:00",
      label: "Breakfast",
      items: [breakfastItem],
      totalMacros: breakfastItem.macros,
      prepTimeMinutes: breakfastItem.cookTimeMinutes,
      status: "pending" as const,
    },
    {
      id: `${date}_meal_2`,
      timeSlot: "11:00",
      label: "Morning snack",
      items: [fallbackItems.midMorning],
      totalMacros: fallbackItems.midMorning.macros,
      prepTimeMinutes: fallbackItems.midMorning.cookTimeMinutes,
      status: "pending" as const,
    },
    {
      id: `${date}_meal_3`,
      timeSlot: "13:30",
      label: "Lunch",
      items: [fallbackItems.lunch],
      totalMacros: fallbackItems.lunch.macros,
      prepTimeMinutes: fallbackItems.lunch.cookTimeMinutes,
      status: "pending" as const,
    },
    {
      id: `${date}_meal_4`,
      timeSlot: "17:00",
      label: "Evening snack",
      items: [fallbackItems.evening],
      totalMacros: fallbackItems.evening.macros,
      prepTimeMinutes: fallbackItems.evening.cookTimeMinutes,
      status: "pending" as const,
    },
    {
      id: `${date}_meal_5`,
      timeSlot: "20:00",
      label: "Dinner",
      items: [dinnerItem],
      totalMacros: dinnerItem.macros,
      prepTimeMinutes: dinnerItem.cookTimeMinutes,
      status: "pending" as const,
    },
  ];

  const totalMacros = meals.reduce<IMacros>(
    (acc, meal) => ({
      protein: acc.protein + meal.totalMacros.protein,
      carbs: acc.carbs + meal.totalMacros.carbs,
      fat: acc.fat + meal.totalMacros.fat,
      calories: acc.calories + meal.totalMacros.calories,
    }),
    { protein: 0, carbs: 0, fat: 0, calories: 0 },
  );

  const allGroceryItems = [
    { name: needsGlutenFree ? "Poha" : "Oats", quantity: "500", unit: "g", isAvailable: false },
    { name: "Milk", quantity: "1", unit: "l", isAvailable: false },
    { name: "Banana", quantity: "6", unit: "piece", isAvailable: false },
    { name: "Mixed fruits", quantity: "1", unit: "kg", isAvailable: false },
    { name: "Dal", quantity: "500", unit: "g", isAvailable: false },
    { name: "Rice", quantity: "1", unit: "kg", isAvailable: false },
    { name: "Mixed vegetables", quantity: "1", unit: "kg", isAvailable: false },
    { name: "Sprouts", quantity: "300", unit: "g", isAvailable: false },
    { name: "Roti atta", quantity: "1", unit: "kg", isAvailable: false },
    { name: "Curd", quantity: "500", unit: "g", isAvailable: false },
  ];

  const groceryList = allGroceryItems.filter((item) => !isUnsafe(item.name));

  const prepTasks = [
    {
      id: "prep_1",
      instruction: "Soak dal for tomorrow lunch",
      scheduledFor: "21:00",
      isDone: false,
      type: "soak" as const,
    },
    {
      id: "prep_2",
      instruction: "Chop vegetables for lunch and dinner",
      scheduledFor: "21:15",
      isDone: false,
      type: "other" as const,
    },
  ];

  const disclaimer =
    "⚠️ This is an AI-generated fallback plan produced because personalised plan generation was temporarily unavailable. It has been filtered for known allergies and conditions, but it is not a substitute for advice from a registered dietitian. Verify all items are safe for your specific health needs before consuming.";

  const medicalNotes = [
    disclaimer,
    chronicConditions.length > 0
      ? `Conditions noted: ${chronicConditions.join(", ")}.`
      : null,
    allergies.length > 0
      ? `Allergens excluded: ${allergies.join(", ")}.`
      : null,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    userId,
    date,
    meals,
    groceryList,
    prepTasks,
    totalMacros: {
      protein: totalMacros.protein || target.protein,
      carbs: totalMacros.carbs || target.carbs,
      fat: totalMacros.fat || target.fat,
      calories: totalMacros.calories || target.calories,
    },
    planType: "regular",
    festivalName: undefined,
    chronicConditions,
    medicalNotes,
    medicineTimingAdvice: [
      "Keep 30-45 minutes gap between medicine and high-fiber meals where applicable.",
    ],
    aiPromptTokens: 0,
    generatedAt: new Date(),
    isManuallyTriggered: false,
    generationAttempts: 1,
    lastError: errorMessage,
    isFallback: true,
    status: "ready",
    isDeleted: false,
  };
};

const buildSystemPrompt = (): string => {
  return "You are AHAR, an expert Indian vegetarian nutritionist and wellness coach. You create highly personalised, practical meal plans for busy Indians. You always respond with valid JSON only. No markdown, no explanation, no preamble. Just the JSON object.";
};

const callOpenAi = async (
  systemPrompt: string,
  userPrompt: string,
): Promise<{
  rawResponse: ChatCompletionResponse;
  content: string;
  tokensUsed: number;
  promptTokens: number;
  completionTokens: number;
}> => {
  ensureAzureConfig();

  try {
    const response = await azureClient.post<ChatCompletionResponse>(
      `/openai/deployments/${openAiDeployment}/chat/completions`,
      {
        model: "gpt-4o",
        temperature: 0.7,
        max_tokens: 2000,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      },
      {
        timeout: 30_000,
      },
    );

    const usage = response.data.usage;
    const promptTokens = usage?.prompt_tokens ?? 0;
    const completionTokens = usage?.completion_tokens ?? 0;
    const tokensUsed = usage?.total_tokens ?? promptTokens + completionTokens;

    const content = toContentString(
      response.data.choices[0]?.message?.content ?? null,
    );

    return {
      rawResponse: response.data,
      content,
      tokensUsed,
      promptTokens,
      completionTokens,
    };
  } catch (error) {
    const isTimeout =
      error instanceof AxiosError &&
      (error.code === "ECONNABORTED" ||
        error.message.toLowerCase().includes("timeout"));

    if (isTimeout || error instanceof AxiosError) {
      throw new Error("AI_TIMEOUT");
    }

    throw error;
  }
};

const saveAuditLog = async (payload: {
  userId: string;
  action: string;
  prompt: string;
  response: string;
  tokensUsed: number;
  costEstimateUsd: number;
  model: string;
  durationMs: number;
  success: boolean;
  errorMessage?: string;
}): Promise<void> => {
  await AuditLogModel.create({
    ...payload,
    timestamp: new Date(),
  });
};

type PersistableDietPlan = Omit<IDietPlan, "createdAt" | "updatedAt">;

const savePlanArtifacts = async (
  plan: PersistableDietPlan,
): Promise<IDietPlan> => {
  const savedPlan = await DietPlanModel.findOneAndUpdate(
    { userId: plan.userId, date: plan.date, isDeleted: false },
    plan,
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  await GroceryListModel.findOneAndUpdate(
    { userId: plan.userId, date: plan.date, isDeleted: false },
    {
      userId: plan.userId,
      date: plan.date,
      items: plan.groceryList,
      generatedAt: plan.generatedAt,
      planId: savedPlan._id,
      isDeleted: false,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  await PrepTaskModel.deleteMany({ userId: plan.userId, date: plan.date });

  if (plan.prepTasks.length) {
    await PrepTaskModel.insertMany(
      plan.prepTasks.map((task) => ({
        ...task,
        userId: plan.userId,
        date: plan.date,
        planId: savedPlan._id,
        isDeleted: false,
      })),
    );
  }

  return savedPlan.toObject();
};

export const generateDietPlan = async (
  userId: string,
  date: string,
): Promise<IDietPlan> => {
  const startedAt = Date.now();

  const profile = await UserProfileModel.findOne({
    userId,
    isDeleted: { $ne: true },
  }).lean();
  if (!profile) {
    throw new Error("PROFILE_NOT_FOUND");
  }

  const planDayOfWeek = new Date(date).getDay();
  const [last7Plans, last3GymLogs, yesterdaysMealLogs, last3DailyLogs, todayLog, activeMedicines] =
    await Promise.all([
      DietPlanModel.find({ userId, isDeleted: false })
        .sort({ date: -1 })
        .limit(7)
        .lean(),
      GymLogModel.find({ userId, isDeleted: false })
        .sort({ date: -1 })
        .limit(3)
        .lean(),
      MealLogModel.find({
        userId,
        date: format(subDays(new Date(date), 1), "yyyy-MM-dd"),
        isDeleted: false,
      }).lean(),
      DailyLogModel.find({ userId, isDeleted: false })
        .sort({ date: -1 })
        .limit(3)
        .lean(),
      DailyLogModel.findOne({ userId, date, isDeleted: false }).lean(),
      MedicineReminderModel.find({
        userId,
        active: true,
        isDeleted: false,
        $or: [{ daysOfWeek: { $size: 0 } }, { daysOfWeek: planDayOfWeek }],
      }).lean(),
    ]);

  const festival = await getTodaysFestival(profile.location.country, date);

  const menstrualPhase =
    profile.gender === "female" && profile.female?.trackCycle
      ? determineMenstrualPhase(profile.female.lastPeriodDate, profile.female.cycleLength ?? 28)
      : "not applicable";

  const latestGymLog = last3GymLogs[0];
  const planType: IDietPlan["planType"] = festival
    ? festival.type === "fast"
      ? "fasting"
      : "festival"
    : !latestGymLog || latestGymLog.activityType === "rest"
      ? "rest"
      : "regular";

  const complianceDenominator = Math.max(last7Plans[0]?.meals.length ?? 0, 1);
  const yesterdaysDoneCount = yesterdaysMealLogs.filter(
    (log) => log.status === "done",
  ).length;
  const compliancePercent = Math.round(
    (yesterdaysDoneCount / complianceDenominator) * 100,
  );

  const recentMealNames = Array.from(
    new Set(
      last7Plans
        .flatMap((plan) => plan.meals)
        .flatMap((meal) => meal.items)
        .map((item) => item.name),
    ),
  )
    .slice(0, 20)
    .join(", ");

  const recentMuscles = Array.from(
    new Set(last3GymLogs.flatMap((entry) => entry.musclesHit)),
  ).join(", ");

  const temporaryCondition = todayLog?.temporaryCondition ?? null;

  const medicineTimingText = activeMedicines.length
    ? activeMedicines
        .map(
          (m) =>
            `${m.time} — ${m.name} ${m.dosage}${m.withFood ? " (must be taken WITH food — schedule a meal at this time)" : " (can be taken without food)"}${m.instructions ? ` [${m.instructions}]` : ""}`,
        )
        .join("; ")
    : null;

  const energyLevels = last3DailyLogs
    .map((log) => log.energyLevel)
    .filter((e): e is number => e !== undefined && e !== null);
  const avgEnergy =
    energyLevels.length > 0
      ? energyLevels.reduce((sum, e) => sum + e, 0) / energyLevels.length
      : null;

  const lastNightSleep = last3DailyLogs[0]?.hoursSlept ?? null;

  const planMonth = new Date(date).getMonth() + 1;
  const season = getSeasonForLocation(profile.location.country, planMonth);
  const seasonGuidance = SEASON_GUIDANCE[season] ?? "";

  const bmi = calculateBmi(profile.weight, profile.height);
  const bmiGuidance = (() => {
    if (bmi < 18.5) {
      return `BMI ${bmi} (Underweight): Increase caloric density with healthy fats (ghee, nuts, avocado) and complex carbs. Add calorie-dense snacks (banana with peanut butter, dates with almonds). Prioritise protein at every meal to support weight gain.`;
    }
    if (bmi < 25) {
      return `BMI ${bmi} (Healthy weight): Maintain current calorie target. Balanced macros.`;
    }
    if (bmi < 30) {
      return `BMI ${bmi} (Overweight): Reduce refined carbs and added sugar. Increase fibre (vegetables, legumes). Prefer low-GI carbs. Keep calories at or below TDEE target. Avoid fried foods and high-calorie snacks.`;
    }
    return `BMI ${bmi} (Obese): Significant calorie reduction needed. Very low GI foods. High volume, low calorie meals (soups, salads, vegetables). No refined carbs, sugar, fried foods. High protein to preserve muscle during weight loss. Small frequent meals to manage hunger.`;
  })();

  const ageGroupGuidance = (() => {
    const age = profile.age;
    const gender = profile.gender;
    if (gender === "female" && age >= 45 && age < 55) {
      return "PERIMENOPAUSE GUIDANCE: User is a woman aged 45-54. Increase calcium (ragi, sesame, dairy) and vitamin D. Include phytoestrogen-rich foods (flaxseeds, soy milk, chickpeas). Reduce caffeine and alcohol. Prioritise sleep-supporting foods. Bone health is a priority.";
    }
    if (age >= 50) {
      return `AGE 50+ GUIDANCE: Protein absorption declines with age — increase protein by 10-15% above target macros and spread intake across all meals (minimum 20g per meal). Include leucine-rich protein sources (paneer, soy, lentils) to preserve muscle mass. Ensure adequate calcium and vitamin D for bone health.`;
    }
    if (age >= 55 && gender === "female") {
      return "POST-MENOPAUSE GUIDANCE: Heart disease risk increases. Include heart-healthy fats (walnuts, flaxseeds), reduce sodium, increase fibre. Bone-protective foods: ragi, sesame, dark leafy greens. Avoid refined carbs and sugar.";
    }
    return null;
  })();

  const systemPrompt = buildSystemPrompt();

  const userPrompt = `USER PROFILE BLOCK:
- Name, age, gender, weight(kg), height(cm), BMI
- Goal (lose/gain/maintain), activityType, gymTime
- TDEE: ${profile.tdee} kcal/day
- Target macros: ${profile.macros.protein}g protein, ${profile.macros.carbs}g carbs, ${profile.macros.fat}g fat
- Hydration goal: ${profile.hydrationGoalMl}ml
- Allergies: ${profile.dietPref.allergies.length ? profile.dietPref.allergies.join(", ") : "none"}
- Chronic conditions: ${profile.dietPref.chronicConditions?.length ? profile.dietPref.chronicConditions.join(", ") : "none"}
- Cuisine preferences: ${profile.dietPref.cuisinePreferences?.length ? profile.dietPref.cuisinePreferences.join(", ") : "none"}
- Foods to avoid: ${profile.dietPref.foodsToAvoid?.length ? profile.dietPref.foodsToAvoid.join(", ") : "none"}
- Fasting window: ${profile.dietPref.fastingWindow ? `${profile.dietPref.fastingWindow.start}-${profile.dietPref.fastingWindow.end}` : "none"}
- Location: ${profile.location.city ?? "Unknown city"}, ${profile.location.country}

SCHEDULE BLOCK:
- Wake: ${profile.schedule.wakeTime}, Sleep: ${profile.schedule.sleepTime}
- Office: ${profile.schedule.officeStart && profile.schedule.officeEnd ? `${profile.schedule.officeStart}-${profile.schedule.officeEnd}` : "none"}
- Gym: ${profile.schedule.gymStart && profile.schedule.gymEnd ? `${profile.schedule.gymStart}-${profile.schedule.gymEnd}` : "none"}

CONTEXT BLOCK:
- Plan date: ${date} (${format(new Date(date), "EEEE")})
- Plan type: ${planType}
- Festival: ${festival?.name ?? "none"}
- Female phase: ${menstrualPhase}
- Last gym session: ${latestGymLog ? `${latestGymLog.date} — ${latestGymLog.activityType}, muscles: ${latestGymLog.musclesHit.join(", ")}, duration: ${latestGymLog.durationMinutes ?? "unknown"} min` : "none"}
- Recent muscles worked (last 3 sessions): ${recentMuscles || "none"}
- Yesterday compliance: ${compliancePercent} %
- Recent meals (avoid repeating): ${recentMealNames || "none"}
- Season: ${season} (${profile.location.country})
${medicineTimingText ? `- MEDICINE SCHEDULE: ${medicineTimingText}` : ""}
- Avg energy (last 3 days): ${avgEnergy !== null ? avgEnergy.toFixed(1) + "/5" : "unknown"}
- Last night sleep: ${lastNightSleep !== null ? lastNightSleep + " hours" : "unknown"}
${temporaryCondition ? `- TODAY'S TEMPORARY CONDITION: ${temporaryCondition}` : ""}

CONSTRAINTS BLOCK:
- Diet: vegetarian only (no eggs, no meat, no fish)
- Account for chronic conditions in meal glycemic load, sodium, fat quality, and meal timing.
${buildConditionConstraints(profile.dietPref.chronicConditions ?? [])}
${menstrualPhase !== "not applicable" && MENSTRUAL_PHASE_GUIDANCE[menstrualPhase] ? `- Menstrual phase guidance: ${MENSTRUAL_PHASE_GUIDANCE[menstrualPhase]}` : ""}
${temporaryCondition ? `- TEMPORARY CONDITION OVERRIDE: User has reported "${temporaryCondition}" today. Prioritise easy-to-digest, soothing foods. For cold/flu: add ginger tea, turmeric milk, warm soups, citrus for vitamin C. For nausea: bland foods (khichdi, plain rice, curd). For headache: magnesium-rich foods, stay hydrated. For injury: anti-inflammatory foods, extra protein for tissue repair. For travelling: portable non-perishable options. For stress: magnesium and B-vitamin rich foods. Reduce heavy proteins and raw vegetables.` : ""}
${avgEnergy !== null && avgEnergy < 2.5 ? `- LOW ENERGY ALERT: Average energy over last 3 days is ${avgEnergy.toFixed(1)}/5. Include iron-rich foods (spinach, lentils, dates), B12 sources, and easily digestible meals. Reduce portion sizes if needed.` : ""}
${lastNightSleep !== null && lastNightSleep < 6 ? `- SLEEP RECOVERY: User slept only ${lastNightSleep} hours last night. Include tryptophan-rich foods (milk, banana, almonds) to support recovery. Keep dinner light and include magnesium-rich foods (pumpkin seeds, dark chocolate) to improve next night's sleep.` : ""}
- Cuisine: ${profile.dietPref.cuisinePreferences?.length ? `Prioritise ${profile.dietPref.cuisinePreferences.join(", ")} cuisine styles` : "Indian preferred, practical for Indian kitchen"}
- HARD FORBIDDEN: The following foods must NEVER appear in any meal, prep task, or grocery list: ${profile.dietPref.foodsToAvoid?.length ? profile.dietPref.foodsToAvoid.join(", ") : "none"}
- HARD FORBIDDEN: The following allergens must be completely excluded: ${profile.dietPref.allergies.length ? profile.dietPref.allergies.join(", ") : "none"}
${profile.dietPref.fastingWindow ? `- FASTING WINDOW: User follows intermittent fasting from ${profile.dietPref.fastingWindow.start} to ${profile.dietPref.fastingWindow.end}. Do NOT schedule any meal outside the eating window (${profile.dietPref.fastingWindow.end} to ${profile.dietPref.fastingWindow.start}).` : ""}
- Each meal prep time must be under 20 minutes
- Ingredients must be common in Indian households
- No exotic/hard-to-find ingredients
- Festival dietary guideline: ${festival ? getFestivalDietGuidelines(festival) : "No festival restrictions today"}
${festival && profile.dietPref.chronicConditions?.length ? `- MEDICAL PRIORITY OVERRIDE: If festival fasting conflicts with any chronic condition (e.g., diabetes, kidney disease, hypoglycemia), ALWAYS prioritise medical safety over religious fasting. Offer a medically safe modified fasting option or gentle regular plan instead.` : ""}
${planType === "rest" && profile.goal !== "maintain" ? `- REST DAY CALORIES: Today is a rest day. ${profile.goal === "lose" ? "Reduce calories by 200-300 kcal below TDEE (cut carbs, keep protein the same). No gym-specific pre/post-workout meals." : "Reduce calories by 100-150 kcal vs training day (reduce carbs slightly). Keep protein the same to support muscle growth. No pre/post-workout meals."}` : ""}
- Season guidance: ${seasonGuidance}
${(() => {
    const conditions = (profile.dietPref.chronicConditions ?? []).map((c) => c.toLowerCase());
    const rules: string[] = [];
    if (conditions.some((c) => c.includes("anemia") || c.includes("iron"))) {
      rules.push("HYDRATION: Avoid tea and coffee within 1 hour of any meal — they inhibit iron absorption.");
    }
    if (conditions.some((c) => c.includes("insomnia"))) {
      rules.push("HYDRATION: No caffeine (tea, coffee, chocolate) after 14:00.");
    }
    if (conditions.some((c) => c.includes("kidney"))) {
      rules.push("HYDRATION: Fluid intake may need to be restricted — do not add extra water-rich foods beyond the hydration goal.");
    }
    if (conditions.some((c) => c.includes("high blood pressure"))) {
      rules.push("HYDRATION: Hibiscus tea and coconut water are beneficial. Avoid excess caffeinated beverages.");
    }
    return rules.length ? rules.join("\n") : "";
  })()}
- BMI context: ${bmiGuidance}
${ageGroupGuidance ? `- ${ageGroupGuidance}` : ""}
- Suggest meals that can be batch-cooked or prepped together

OUTPUT FORMAT — respond with EXACTLY this JSON structure, no extra fields, no missing fields:
{
  "planType": "regular|festival|fasting|rest",
  "festivalName": "string or null",
  "totalMacros": {
    "protein": number,
    "carbs": number,
    "fat": number,
    "calories": number
  },
  "meals": [
    {
      "id": "meal_1",
      "timeSlot": "HH:mm",
      "label": "Breakfast|Morning snack|Lunch|Evening snack|Pre-workout|Dinner|Post-workout",
      "items": [
        {
          "name": "string",
          "quantity": "string",
          "unit": "string (g/ml/cup/piece/tbsp)",
          "macros": {
            "protein": number,
            "carbs": number,
            "fat": number,
            "calories": number
          },
          "cookTimeMinutes": number
        }
      ],
      "totalMacros": { "protein":n,"carbs":n,"fat":n,"calories":n },
      "prepTimeMinutes": number
    }
  ],
  "groceryList": [
    {
      "name": "string",
      "quantity": "string",
      "unit": "string"
    }
  ],
  "prepTasks": [
    {
      "id": "prep_1",
      "instruction": "string (e.g. Soak 100g chana in water)",
      "scheduledFor": "HH:mm (tonight's time to do this)",
      "type": "soak|marinate|defrost|other"
    }
  ]
}

Meal slots must align with user's schedule:
- If wakeTime is 07:00: breakfast around 07:30-08:00
- Pre-workout meal 45min before gymStart
- Post-workout meal within 30min after gymEnd
- No meal within 2hrs of sleepTime
- For rest/no-gym days: skip pre/post workout slots
- Minimum 4 meals, maximum 6 meals per day

USER PROFILE DETAILS:
- Name: ${profile.name}
- Age: ${profile.age}
- Gender: ${profile.gender}
- Weight: ${profile.weight} kg
- Height: ${profile.height} cm
- BMI: ${calculateBmi(profile.weight, profile.height)}`;

  try {
    const aiResult = await callOpenAi(systemPrompt, userPrompt);

    let parsed: z.infer<typeof generatedPlanSchema>;
    try {
      parsed = generatedPlanSchema.parse(JSON.parse(aiResult.content));
    } catch (error) {
      logger.error(`Invalid AI JSON for user ${userId}: ${String(error)}`);
      throw new Error("AI_INVALID_JSON");
    }

    if (
      !parsed.meals ||
      !parsed.groceryList ||
      !parsed.prepTasks ||
      !parsed.totalMacros
    ) {
      throw new Error("AI_INVALID_STRUCTURE");
    }

    const mappedPlan: IDietPlan = {
      userId,
      date,
      meals: parsed.meals.map((meal, index) => ({
        ...meal,
        id: `${date}_meal_${index + 1}`,
        status: "pending",
      })),
      groceryList: parsed.groceryList.map((item) => ({
        ...item,
        isAvailable: false,
      })),
      prepTasks: parsed.prepTasks.map((task) => ({ ...task, isDone: false })),
      totalMacros: parsed.totalMacros,
      planType: parsed.planType,
      festivalName: parsed.festivalName ?? undefined,
      chronicConditions: profile.dietPref.chronicConditions ?? [],
      medicalNotes: profile.dietPref.chronicConditions?.length
        ? `Generated with chronic conditions: ${profile.dietPref.chronicConditions.join(", ")}`
        : undefined,
      medicineTimingAdvice: profile.dietPref.chronicConditions?.length
        ? [
            "Keep medicine timing separate from high-fiber meals when advised by your doctor.",
            "Avoid skipping meals on medicine days.",
          ]
        : [],
      aiPromptTokens: aiResult.tokensUsed,
      generatedAt: new Date(),
      isManuallyTriggered: false,
      generationAttempts: 1,
      status: "ready",
      isFallback: false,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const savedPlan = await savePlanArtifacts(mappedPlan);
    await awardBadge(userId, "first_plan");

    const costEstimateUsd =
      estimateCostUsd(aiResult.promptTokens, aiResult.completionTokens);

    await saveAuditLog({
      userId,
      action: "diet_plan_generated",
      prompt: userPrompt,
      response: JSON.stringify(aiResult.rawResponse),
      tokensUsed: aiResult.tokensUsed,
      costEstimateUsd,
      model: "gpt-4o",
      durationMs: Date.now() - startedAt,
      success: true,
    });

    return savedPlan;
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI_PLAN_FAILED";

    const fallbackPlan = createFallbackPlan(
      userId,
      date,
      profile.macros,
      message,
      profile.dietPref.chronicConditions ?? [],
      profile.dietPref.allergies ?? [],
    );
    const savedFallbackPlan = await savePlanArtifacts(fallbackPlan);

    await saveAuditLog({
      userId,
      action: "diet_plan_generated",
      prompt: userPrompt,
      response: JSON.stringify({ fallback: true, error: message }),
      tokensUsed: 0,
      costEstimateUsd: 0,
      model: "gpt-4o",
      durationMs: Date.now() - startedAt,
      success: false,
      errorMessage: message,
    });

    return savedFallbackPlan;
  }
};

export const generateAlternatives = async (
  userId: string,
  mealId: string,
  planDate: string,
  reason: "not_available" | "not_eaten" | "disliked",
): Promise<IFoodItem[][]> => {
  const startedAt = Date.now();

  const getFallbackAlternatives = (mealLabel?: string): IFoodItem[][] => {
    const slot = mealLabel?.toLowerCase() ?? "";

    if (slot.includes("breakfast") || slot.includes("morning")) {
      return [
        [
          {
            name: "Poha with peanuts",
            quantity: "1",
            unit: "plate",
            macros: { protein: 10, carbs: 45, fat: 12, calories: 320 },
            cookTimeMinutes: 12,
          },
        ],
        [
          {
            name: "Vegetable upma",
            quantity: "1",
            unit: "bowl",
            macros: { protein: 9, carbs: 42, fat: 10, calories: 300 },
            cookTimeMinutes: 12,
          },
        ],
        [
          {
            name: "Besan chilla with curd",
            quantity: "2",
            unit: "piece",
            macros: { protein: 16, carbs: 30, fat: 9, calories: 275 },
            cookTimeMinutes: 14,
          },
        ],
      ];
    }

    if (slot.includes("lunch") || slot.includes("dinner")) {
      return [
        [
          {
            name: "Rajma chawal",
            quantity: "1",
            unit: "plate",
            macros: { protein: 18, carbs: 62, fat: 8, calories: 410 },
            cookTimeMinutes: 18,
          },
        ],
        [
          {
            name: "Chole with 2 phulka",
            quantity: "1",
            unit: "plate",
            macros: { protein: 20, carbs: 58, fat: 10, calories: 430 },
            cookTimeMinutes: 18,
          },
        ],
        [
          {
            name: "Dal khichdi with curd",
            quantity: "1",
            unit: "bowl",
            macros: { protein: 16, carbs: 54, fat: 9, calories: 360 },
            cookTimeMinutes: 16,
          },
        ],
      ];
    }

    return [
      [
        {
          name: "Paneer bhurji wrap",
          quantity: "1",
          unit: "plate",
          macros: { protein: 22, carbs: 28, fat: 16, calories: 340 },
          cookTimeMinutes: 15,
        },
      ],
      [
        {
          name: "Chana salad bowl",
          quantity: "1",
          unit: "bowl",
          macros: { protein: 18, carbs: 34, fat: 8, calories: 290 },
          cookTimeMinutes: 12,
        },
      ],
      [
        {
          name: "Sprouts bhel",
          quantity: "1",
          unit: "bowl",
          macros: { protein: 14, carbs: 30, fat: 7, calories: 250 },
          cookTimeMinutes: 10,
        },
      ],
    ];
  };

  const profile = await UserProfileModel.findOne({
    userId,
    isDeleted: { $ne: true },
  }).lean();
  const plan = await DietPlanModel.findOne({
    userId,
    date: planDate,
    isDeleted: false,
  }).lean();

  if (!profile || !plan) {
    return getFallbackAlternatives();
  }

  const meal = plan.meals.find((entry) => entry.id === mealId);
  if (!meal) {
    return getFallbackAlternatives();
  }

  const altMenstrualPhase =
    profile.gender === "female" && profile.female?.trackCycle
      ? determineMenstrualPhase(profile.female.lastPeriodDate, profile.female.cycleLength ?? 28)
      : "not applicable";

  const systemPrompt = buildSystemPrompt();
  const userPrompt = `Given this meal (original items + macros), user profile, and reason for replacement, suggest 3 alternative complete meals with similar macros, quick prep (under 15 min), Indian vegetarian, common ingredients.

PROFILE:
- Allergies: ${profile.dietPref.allergies.length ? profile.dietPref.allergies.join(", ") : "none"}
- Foods to avoid (NEVER include): ${profile.dietPref.foodsToAvoid?.length ? profile.dietPref.foodsToAvoid.join(", ") : "none"}
- Chronic conditions: ${profile.dietPref.chronicConditions?.length ? profile.dietPref.chronicConditions.join(", ") : "none"}
- Vegetarian: ${profile.dietPref.isVeg ? "yes" : "custom"}
- Goal: ${profile.goal}
- Meal time slot: ${meal.timeSlot} (${meal.label})
- Menstrual phase: ${altMenstrualPhase}
${altMenstrualPhase !== "not applicable" && MENSTRUAL_PHASE_GUIDANCE[altMenstrualPhase] ? `- Phase dietary guidance: ${MENSTRUAL_PHASE_GUIDANCE[altMenstrualPhase]}` : ""}
${buildConditionConstraints(profile.dietPref.chronicConditions ?? [])}

ORIGINAL MEAL:
${JSON.stringify(meal)}

REASON:
${reason}

Response JSON: { alternatives: [ { items:FoodItem[], prepTimeMinutes:number, label:string, totalMacros:Macros }[] ] }`;

  try {
    const aiResult = await callOpenAi(systemPrompt, userPrompt);

    const parsed = alternativesSchema.parse(JSON.parse(aiResult.content));
    const allAlternatives = parsed.alternatives
      .map((alt) => alt.items)
      .filter((items) => items.length > 0);

    const deduped = allAlternatives.filter((items, index, arr) => {
      const signature = items
        .map((item) => `${item.name}-${item.quantity}-${item.unit}`)
        .sort()
        .join("|");

      return (
        arr.findIndex((candidate) => {
          const candidateSignature = candidate
            .map((item) => `${item.name}-${item.quantity}-${item.unit}`)
            .sort()
            .join("|");
          return candidateSignature === signature;
        }) === index
      );
    });

    const result =
      deduped.length >= 3
        ? deduped.slice(0, 3)
        : [...deduped, ...getFallbackAlternatives(meal.label)].slice(0, 3);

    const costEstimateUsd =
      estimateCostUsd(aiResult.promptTokens, aiResult.completionTokens);

    await saveAuditLog({
      userId,
      action: "meal_alternatives_generated",
      prompt: userPrompt,
      response: JSON.stringify(aiResult.rawResponse),
      tokensUsed: aiResult.tokensUsed,
      costEstimateUsd,
      model: "gpt-4o",
      durationMs: Date.now() - startedAt,
      success: true,
    });

    return result;
  } catch (error) {
    const fallbackAlternatives = getFallbackAlternatives(meal.label);

    await saveAuditLog({
      userId,
      action: "meal_alternatives_generated",
      prompt: userPrompt,
      response: JSON.stringify({ alternatives: fallbackAlternatives }),
      tokensUsed: 0,
      costEstimateUsd: 0,
      model: "gpt-4o",
      durationMs: Date.now() - startedAt,
      success: false,
      errorMessage:
        error instanceof Error ? error.message : "ALTERNATIVE_FALLBACK",
    });

    return fallbackAlternatives;
  }
};

export const markPlanGenerationActivity = async (payload: {
  userId: string;
  date: string;
  tokensUsed: number;
  planType: IDietPlan["planType"];
}): Promise<void> => {
  await ActivityLogModel.create({
    userId: payload.userId,
    action: "plan_generated",
    metadata: {
      date: payload.date,
      tokensUsed: payload.tokensUsed,
      planType: payload.planType,
    },
    timestamp: new Date(),
  });
};
