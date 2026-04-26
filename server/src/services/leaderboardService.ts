import { StreakModel } from "../models/Streak";
import { WeeklyCheckinModel } from "../models/WeeklyCheckin";
import { UserProfileModel } from "../models/UserProfile";

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

const maskName = (fullName: string): string => {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0];
  }
  return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`;
};

let cache: { data: LeaderboardResponse; expiresAt: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

export const getLeaderboardForUser = async (
  userId: string,
  limit = 20,
): Promise<LeaderboardResponse> => {
  if (cache && Date.now() < cache.expiresAt) {
    const cached = cache.data;
    return {
      ...cached,
      entries: cached.entries.slice(0, limit),
      currentUser:
        cached.currentUser?.userId === userId ? cached.currentUser : null,
    };
  }

  const latest = await WeeklyCheckinModel.aggregate<{
    userId: string;
    score: number;
    mealComplianceRate: number;
    gymDaysActual: number;
  }>([
    { $match: { isDeleted: false, status: "ready" } },
    { $sort: { weekStart: -1 } },
    {
      $group: {
        _id: "$userId",
        userId: { $first: "$userId" },
        score: { $first: "$score" },
        mealComplianceRate: { $first: "$mealComplianceRate" },
        gymDaysActual: { $first: "$gymDaysActual" },
      },
    },
    { $sort: { score: -1, mealComplianceRate: -1, gymDaysActual: -1 } },
  ]);

  if (!latest.length) {
    return { entries: [], currentUser: null, totalUsers: 0 };
  }

  const totalUsers = latest.length;
  const userIds = latest.map((item) => item.userId);

  const [profiles, streaks] = await Promise.all([
    UserProfileModel.find({
      userId: { $in: userIds },
      isDeleted: { $ne: true },
    })
      .select("userId name avatarUrl")
      .lean(),
    StreakModel.aggregate<{ _id: string; maxStreak: number }>([
      { $match: { userId: { $in: userIds } } },
      {
        $group: {
          _id: "$userId",
          maxStreak: { $max: "$currentStreak" },
        },
      },
    ]),
  ]);

  const profileMap = new Map(
    profiles.map((profile) => [profile.userId, profile] as const),
  );
  const streakMap = new Map(
    streaks.map((s) => [s._id, s.maxStreak] as const),
  );

  const ranked: LeaderboardEntry[] = latest.map((item, index) => {
    const profile = profileMap.get(item.userId);
    const rank = index + 1;
    const percentile = Math.round(((totalUsers - rank) / totalUsers) * 100);
    return {
      rank,
      userId: item.userId,
      name: maskName(profile?.name ?? "AHAR User"),
      avatarUrl: profile?.avatarUrl,
      score: Math.round(item.score),
      mealComplianceRate: Math.round(item.mealComplianceRate),
      gymDaysActual: item.gymDaysActual,
      streakDays: streakMap.get(item.userId) ?? 0,
      percentile,
    };
  });

  const response: LeaderboardResponse = {
    entries: ranked.slice(0, limit),
    currentUser: ranked.find((item) => item.userId === userId) ?? null,
    totalUsers,
  };

  cache = { data: { ...response, entries: ranked }, expiresAt: Date.now() + CACHE_TTL_MS };

  return response;
};
