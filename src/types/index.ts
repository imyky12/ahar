export interface User {
  _id: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FastingWindow {
  start: string;
  end: string;
}

export interface DietPreferences {
  isVeg: boolean;
  allergies: string[];
  chronicConditions?: ChronicCondition[];
  cuisinePreferences?: string[];
  foodsToAvoid?: string[];
  fastingWindow?: FastingWindow;
}

export type ChronicCondition =
  | "diabetes_type_2"
  | "hypertension"
  | "thyroid_hypothyroidism"
  | "thyroid_hyperthyroidism"
  | "pcos"
  | "high_cholesterol"
  | "fatty_liver"
  | "acid_reflux"
  | "ibs"
  | "celiac"
  | "anemia"
  | "vitamin_d_deficiency"
  | "vitamin_b12_deficiency"
  | "arthritis"
  | "asthma"
  | "chronic_kidney_disease"
  | "migraine"
  | "osteoporosis"
  | "gout"
  | "insomnia"
  | "none";

export interface DailySchedule {
  wakeTime: string;
  sleepTime: string;
  officeStart?: string;
  officeEnd?: string;
  gymStart?: string;
  gymEnd?: string;
}

export interface UserLocation {
  country: string;
  timezone: string;
  city?: string;
}

export interface FemaleProfile {
  trackCycle: boolean;
  lastPeriodDate?: Date;
  cycleLength?: number;
}

export interface Macros {
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
}

export interface UserProfile {
  _id?: string;
  userId: string;
  avatarUrl?: string;
  name: string;
  age: number;
  gender: "male" | "female" | "other";
  weight: number;
  height: number;
  activityType: "gym" | "home" | "run" | "walk" | "desk" | "yoga";
  gymTime: "morning" | "evening" | "none";
  goal: "lose" | "gain" | "maintain";
  dietPref: DietPreferences;
  schedule: DailySchedule;
  location: UserLocation;
  female?: FemaleProfile;
  tdee: number;
  hydrationGoalMl: number;
  macros: Macros;
  isOnboardingComplete?: boolean;
  onboardingCompletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface OnboardingProfileInput {
  avatarUrl?: string;
  name: string;
  age: number;
  gender: "male" | "female" | "other";
  weight: number;
  height: number;
  activityType: "gym" | "home" | "run" | "walk" | "desk" | "yoga";
  gymTime: "morning" | "evening" | "none";
  goal: "lose" | "gain" | "maintain";
  dietPref: DietPreferences;
  schedule: DailySchedule;
  location: UserLocation;
  female?: FemaleProfile;
}

export interface FoodItem {
  name: string;
  quantity: string;
  unit: string;
  macros: Macros;
  cookTimeMinutes: number;
}

export interface GroceryItem {
  name: string;
  quantity: string;
  unit: string;
  isAvailable?: boolean;
}

export interface PrepTask {
  id: string;
  instruction: string;
  scheduledFor: string;
  isDone: boolean;
  type: "soak" | "marinate" | "defrost" | "other";
}

export interface Meal {
  id: string;
  timeSlot: string;
  label: string;
  items: FoodItem[];
  totalMacros: Macros;
  prepTimeMinutes: number;
  status: "pending" | "done" | "skipped" | "alternative";
  alternativeTaken?: FoodItem[];
}

export interface DietPlan {
  _id: string;
  userId: string;
  date: string;
  meals: Meal[];
  groceryList: GroceryItem[];
  prepTasks: PrepTask[];
  totalMacros: Macros;
  planType: "regular" | "festival" | "fasting" | "rest";
  festivalName?: string;
  chronicConditions?: ChronicCondition[];
  medicalNotes?: string;
  medicineTimingAdvice?: string[];
  aiPromptTokens: number;
  generatedAt: Date;
}

export interface GymLog {
  _id: string;
  userId: string;
  date: string;
  musclesHit: string[];
  activityType: "gym" | "run" | "walk" | "home" | "yoga" | "rest";
  durationMinutes?: number;
  notes?: string;
}

export interface MealLog {
  _id: string;
  userId: string;
  date: string;
  mealId: string;
  status: "done" | "skipped" | "alternative";
  alternativeItems?: FoodItem[];
  loggedAt: Date;
}

export interface MealLogEntry {
  mealId: string;
  planId: string;
  status: "done" | "skipped" | "alternative";
  alternativeItems: FoodItem[];
  loggedAt: Date;
  macrosConsumed: Macros;
}

export interface DailyLog {
  _id?: string;
  userId: string;
  date: string;
  energyLevel?: number;
  sleepQuality?: number;
  hoursSlept?: number;
  waterIntakeMl: number;
  waterLogs: Array<{ amount: number; loggedAt: Date }>;
  mealLogs: MealLogEntry[];
  totalMacrosConsumed: Macros;
  macroCompliancePercent: number;
  notes?: string;
  temporaryCondition?: string;
}

export interface DailyStats {
  macros: {
    consumed: Macros;
    target: Macros;
    percent: number;
  };
  water: {
    consumed: number;
    goal: number;
    percent: number;
    logsCount: number;
  };
  meals: {
    total: number;
    done: number;
    skipped: number;
    pending: number;
    compliancePercent: number;
  };
  energy: number | null;
  sleep: { quality: number; hours: number } | null;
  streakUpdates: Array<{ type: string; current: number }>;
}

export interface WaterResponse {
  waterIntakeMl: number;
  hydrationGoalMl: number;
  percentComplete: number;
}

export interface GymLogParams {
  date: string;
  musclesHit: string[];
  activityType: string;
  durationMinutes?: number;
  notes?: string;
}

export interface WeekHistory {
  days: Array<{
    date: string;
    dailyLog: DailyLog | null;
    gymLog: GymLog | null;
  }>;
}

export interface Badge {
  badgeId: string;
  label: string;
  icon: string;
  desc: string;
  earnedAt: Date;
  isNew: boolean;
}

export interface WeeklyCheckin {
  _id: string;
  userId: string;
  weekStart: string;
  weekEnd: string;
  weight: number;
  sleepQualityAvg: number;
  mealComplianceRate: number;
  gymDays: number;
  gymDaysActual: number;
  avgSleepHours: number;
  avgEnergyLevel: number;
  waterGoalHitDays: number;
  headline: string;
  score: number;
  wins: string[];
  improvements: string[];
  aiSummary: string;
  adjustments: string[];
  focusTip: string;
  motivationalNote: string;
  status: "pending" | "generating" | "ready" | "failed";
  generatedAt?: string;
}

export interface WeightLog {
  _id: string;
  userId: string;
  date: string;
  weightKg: number;
  bodyFatPercent?: number;
  muscleMassKg?: number;
  notes?: string;
  source: "manual" | "weekly_checkin";
}

export interface WeeklyDataAggregate {
  weekStart: string;
  weekEnd: string;
  mealComplianceRate: number;
  avgSleepHours: number;
  avgEnergyLevel: number;
  gymDaysActual: number;
  waterGoalHitDays: number;
  score: number;
}

export interface ProgressStats {
  currentWeek: WeeklyCheckin | null;
  weeklyHistory: WeeklyCheckin[];
  weightLogs: WeightLog[];
  streaks: Streak[];
  badges: Badge[];
  summary: {
    scoreDelta: number;
    weightChangeKg: number;
    badgesEarned: number;
    newBadges: number;
  };
}

export interface Streak {
  userId: string;
  type: "diet" | "gym" | "water" | "sleep";
  currentStreak: number;
  longestStreak: number;
  lastLoggedDate: string;
}

export interface AuditLog {
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
  timestamp: Date;
}

export type NotificationType =
  | "plan_ready"
  | "prep_task"
  | "meal_checkin"
  | "water_reminder"
  | "walk_reminder"
  | "skin_care"
  | "supplement"
  | "gym_log"
  | "sleep_checkin"
  | "macro_alert"
  | "weekly_checkin"
  | "energy_checkin"
  | "grocery_ready"
  | "streak_milestone"
  | "daily_quote"
  | "medicine_reminder";

export type NotificationSound = "default" | "gentle" | "alert" | "chime";
export type NotificationPriority = "low" | "normal" | "high";

export interface AppNotification {
  _id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  scheduledFor: Date;
  sentAt?: Date;
  isSent: boolean;
  isRead: boolean;
  expoNotificationId?: string;
  sound: NotificationSound;
  priority: NotificationPriority;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserNotificationEnabledTypes {
  plan_ready: boolean;
  prep_task: boolean;
  meal_checkin: boolean;
  water_reminder: boolean;
  walk_reminder: boolean;
  skin_care: boolean;
  supplement: boolean;
  gym_log: boolean;
  sleep_checkin: boolean;
  macro_alert: boolean;
  weekly_checkin: boolean;
  energy_checkin: boolean;
  grocery_ready: boolean;
  streak_milestone: boolean;
  daily_quote: boolean;
  medicine_reminder: boolean;
}

export type QuoteCategory = "motivational" | "funny" | "fitness" | "mindfulness";
export type QuotePreference = QuoteCategory | "mixed";

export interface UserNotificationSettings {
  userId: string;
  expoPushToken?: string;
  notificationsEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  enabledTypes: UserNotificationEnabledTypes;
  waterReminderIntervalMinutes: number;
  quotePreference: QuotePreference;
}

export interface DailyQuoteResponse {
  quote: {
    id: string;
    text: string;
    author: string;
    category: QuoteCategory;
  };
  date: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatarUrl?: string;
  score: number;
  mealComplianceRate: number;
  gymDaysActual: number;
  streakDays: number;
  percentile: number;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  currentUser: LeaderboardEntry | null;
  totalUsers: number;
}

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface MedicineReminder {
  _id: string;
  userId: string;
  name: string;
  dosage: string;
  time: string;
  daysOfWeek: DayOfWeek[];
  instructions?: string;
  withFood: boolean;
  active: boolean;
  dosesLogged: number;
  refillReminderDays: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MedicineReminderInput {
  name: string;
  dosage: string;
  time: string;
  daysOfWeek?: DayOfWeek[];
  instructions?: string;
  withFood: boolean;
  active: boolean;
  refillReminderDays?: number;
}

export interface MedicineLog {
  _id: string;
  userId: string;
  reminderId: string;
  date: string;
  timingLabel: string;
  status: "taken" | "skipped";
  loggedAt: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MedicineLogInput {
  date: string;
  timingLabel: string;
  status: "taken" | "skipped";
  notes?: string;
}
