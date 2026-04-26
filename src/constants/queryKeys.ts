export const QUERY_KEYS = {
  auth: {
    me: ["auth", "me"] as const,
    session: ["auth", "session"] as const,
  },
  profile: {
    detail: ["profile", "detail"] as const,
  },
  plans: {
    today: ["plans", "today"] as const,
    tomorrow: ["plans", "tomorrow"] as const,
    byDate: (date: string) => ["plans", "byDate", date] as const,
  },
  logs: {
    daily: (date: string) => ["logs", "daily", date] as const,
    stats: (date: string) => ["logs", "stats", date] as const,
    meals: (date: string) => ["logs", "meals", date] as const,
    gym: (date: string) => ["logs", "gym", date] as const,
    water: (date: string) => ["logs", "water", date] as const,
    sleep: (date: string) => ["logs", "sleep", date] as const,
  },
  weekly: {
    summary: (weekStart: string) => ["weekly", "summary", weekStart] as const,
    checkin: (weekStart: string) => ["weekly", "checkin", weekStart] as const,
  },
  progress: {
    stats: ["progress", "stats"] as const,
    history: ["progress", "history"] as const,
    weeklySummary: (weekStart: string, weekEnd: string) =>
      ["progress", "weeklySummary", weekStart, weekEnd] as const,
    weightLogs: ["progress", "weightLogs"] as const,
    badges: ["progress", "badges"] as const,
  },
  streaks: {
    all: ["streaks", "all"] as const,
  },
  notifications: {
    history: ["notifications", "history"] as const,
    settings: ["notifications", "settings"] as const,
    unread: ["notifications", "unread"] as const,
  },
  leaderboard: {
    list: ["leaderboard", "list"] as const,
  },
  quotes: {
    today: ["quotes", "today"] as const,
  },
  medicines: {
    list: ["medicines", "list"] as const,
  },
} as const;
