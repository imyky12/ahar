const FALLBACK_API_BASE_URL = "http://localhost:3000/api/v1";
const FALLBACK_AZURE_OPENAI_ENDPOINT = "https://example.openai.azure.com";

const normalizeApiBaseUrl = (rawUrl: string): string => {
  const trimmed = rawUrl.trim().replace(/\/+$/, "");
  if (trimmed.endsWith("/api/v1")) {
    return trimmed;
  }

  return `${trimmed}/api/v1`;
};

export const API_BASE_URL = normalizeApiBaseUrl(
  process.env.EXPO_PUBLIC_API_BASE_URL ?? FALLBACK_API_BASE_URL,
);

export const AZURE_OPENAI_ENDPOINT =
  process.env.EXPO_PUBLIC_AZURE_OPENAI_ENDPOINT ??
  FALLBACK_AZURE_OPENAI_ENDPOINT;

export const API_ROUTES = {
  auth: {
    register: "/auth/register",
    login: "/auth/login",
    refresh: "/auth/refresh",
    logout: "/auth/logout",
    me: "/auth/me",
  },
  profile: {
    detail: "/profile",
    chronicConditions: "/profile/chronic-conditions",
    avatar: "/profile/avatar",
    festivals: "/profile/festivals",
    exportData: "/profile/export",
    deleteAccount: "/profile/delete",
  },
  plans: {
    today: "/plans/today",
    tomorrow: "/plans/tomorrow",
    byDate: (date: string) => `/plans/${date}`,
    generate: "/plans/generate",
    prepTask: "/plans/prep-task",
    alternatives: "/plans/alternatives",
  },
  logs: {
    energy: "/logs/energy",
    meal: "/logs/meal",
    mealSkip: "/logs/meal/skip",
    gym: "/logs/gym",
    gymHistory: "/logs/gym/history",
    water: "/logs/water",
    sleep: "/logs/sleep",
    daily: "/logs/daily",
    stats: "/logs/stats",
    week: "/logs/week",
    streaks: "/logs/streaks",
  },
  notifications: {
    token: "/notifications/token",
    history: "/notifications/history",
    debug: "/notifications/debug",
    read: "/notifications/read",
    settings: "/notifications/settings",
    reschedule: "/notifications/reschedule",
  },
  leaderboard: {
    list: "/leaderboard",
  },
  quotes: {
    today: "/quotes/today",
  },
  medicines: {
    list: "/medicines",
    update: (id: string) => `/medicines/${id}`,
    logDose: (id: string) => `/medicines/${id}/log`,
    doses: "/medicines/doses",
  },
  progress: {
    checkin: "/progress/checkin",
    weeklySummary: "/progress/weekly-summary",
    stats: "/progress/stats",
    history: "/progress/history",
    weight: "/progress/weight",
    badgesSeen: "/progress/badges/seen",
  },
  ai: {
    generatePlan: "/ai/generate-plan",
    adjustments: "/ai/adjustments",
  },
  health: {
    ping: "/health",
  },
  logsClient: {
    clientError: "/logs/client-error",
  },
} as const;
