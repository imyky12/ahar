import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  AharCard,
  AharText,
  SkeletonCard,
  useToast,
} from "../../../src/components/atoms";
import {
  MealCard,
  NotificationBell,
  PrepTaskCard,
} from "../../../src/components/molecules";
import {
  MacroDashboard,
  QuickActions,
  StreakPanel,
  WaterTracker,
} from "../../../src/components/organisms";
import {
  API_ROUTES,
  COLORS,
  QUERY_KEYS,
  SPACING,
  getTipOfTheDay,
} from "../../../src/constants";
import {
  useDailyLog,
  usePlan,
  useProfile,
  useProgress,
} from "../../../src/hooks";
import { authClient } from "../../../src/services/authService";
import { usePlanStore, useUiStore } from "../../../src/stores";
import type { Streak } from "../../../src/types";

export const DashboardScreen = () => {
  const { showToast } = useToast();
  const { dailyLog, stats, isLoading, logMeal, logWater, refetch } =
    useDailyLog();
  const { profile } = useProfile();
  const { stats: progressStats } = useProgress();
  const { todaysPlan, refetchToday, updatePrepTask } = usePlan();
  const updateMealStatus = usePlanStore((state) => state.updateMealStatus);

  const setShowEnergyCheckinModal = useUiStore(
    (state) => state.setShowEnergyCheckinModal,
  );
  const setShowGymLogModal = useUiStore((state) => state.setShowGymLogModal);
  const setShowSleepCheckinModal = useUiStore(
    (state) => state.setShowSleepCheckinModal,
  );
  const setShowPeriodCheckinModal = useUiStore(
    (state) => state.setShowPeriodCheckinModal,
  );
  const currentDate = useUiStore((state) => state.currentDate);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showEnergyBanner, setShowEnergyBanner] = useState(true);
  const [showPeriodBanner, setShowPeriodBanner] = useState(true);
  const [expandedMealId, setExpandedMealId] = useState<string | null>(null);

  const now = new Date();
  const hour = now.getHours();
  const greetingPrefix =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const streaksQuery = useQuery({
    queryKey: QUERY_KEYS.streaks.all,
    queryFn: async () => {
      const response = await authClient.get<{
        success: boolean;
        data?: { streaks: Streak[] };
      }>(API_ROUTES.logs.streaks);

      return response.data.data?.streaks ?? [];
    },
    staleTime: 30_000,
  });

  const onRefresh = async (): Promise<void> => {
    setIsRefreshing(true);
    try {
      refetch();
      await refetchToday();
      await streaksQuery.refetch();
    } finally {
      setIsRefreshing(false);
    }
  };

  const tip = getTipOfTheDay();
  const consumedMacros = dailyLog?.totalMacrosConsumed ?? {
    protein: 0,
    carbs: 0,
    fat: 0,
    calories: 0,
  };
  const targetMacros = stats?.macros.target ??
    profile?.macros ?? {
      protein: 0,
      carbs: 0,
      fat: 0,
      calories: 0,
    };

  const streaks = streaksQuery.data ?? [];

  const initials = useMemo(() => {
    const name = profile?.name ?? "AH";
    return name
      .split(" ")
      .map((part) => part[0]?.toUpperCase() ?? "")
      .slice(0, 2)
      .join("");
  }, [profile?.name]);

  // Show period banner if female + trackCycle + last period date is > 20 days old (nearing next cycle)
  const isPeriodBannerDue = useMemo(() => {
    if (profile?.gender !== "female" || !profile.female?.trackCycle) return false;
    if (!profile.female.lastPeriodDate) return true;
    const lastPeriod = new Date(profile.female.lastPeriodDate);
    const daysSince = Math.floor((Date.now() - lastPeriod.getTime()) / 86_400_000);
    const cycleLength = profile.female.cycleLength ?? 28;
    // Prompt update when >= 75% through cycle (approaching next period)
    return daysSince >= Math.floor(cycleLength * 0.75);
  }, [profile]);

  const topMeals = useMemo(() => {
    return (todaysPlan?.meals ?? [])
      .filter(
        (meal) => meal.status === "pending" || meal.status === "alternative",
      )
      .slice(0, 3);
  }, [todaysPlan?.meals]);

  if (isLoading && !dailyLog) {
    return (
      <View style={styles.centered}>
        <SkeletonCard lines={4} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void onRefresh()}
            tintColor={COLORS.primary}
          />
        }
      >
        <View style={styles.headerCard}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <AharText variant="h2" weight="bold">
                {greetingPrefix}, {profile?.name ?? "there"}{" "}
                {hour < 12 ? "🌅" : hour < 17 ? "☀️" : "🌙"}
              </AharText>
              <AharText variant="caption" color={COLORS.textSecondary}>
                {format(now, "EEEE, d MMMM yyyy")}
              </AharText>
            </View>
            <View style={styles.headerBellWrap}>
              <View style={styles.headerActions}>
                <View style={styles.avatarWrap}>
                  {profile?.avatarUrl ? (
                    <Image
                      source={{ uri: profile.avatarUrl }}
                      style={styles.avatar}
                    />
                  ) : (
                    <View style={[styles.avatar, styles.avatarFallback]}>
                      <AharText variant="caption" weight="bold">
                        {initials}
                      </AharText>
                    </View>
                  )}
                </View>
                <NotificationBell
                  onPress={() => router.push("/(tabs)/notifications" as never)}
                />
              </View>
            </View>
          </View>

          {!dailyLog?.energyLevel && dailyLog?.date === currentDate && showEnergyBanner ? (
            <Pressable
              style={styles.energyBanner}
              onPress={() => setShowEnergyCheckinModal(true)}
            >
              <AharText variant="label" color={COLORS.textSecondary}>
                How&apos;s your energy? Tap to check in →
              </AharText>
              <Pressable onPress={() => setShowEnergyBanner(false)}>
                <Ionicons name="close" size={16} color={COLORS.textSecondary} />
              </Pressable>
            </Pressable>
          ) : null}

          {isPeriodBannerDue && showPeriodBanner ? (
            <Pressable
              style={styles.periodBanner}
              onPress={() => setShowPeriodCheckinModal(true)}
            >
              <AharText variant="label" color={COLORS.textSecondary}>
                🌸 Update your period date for better meal plans →
              </AharText>
              <Pressable onPress={() => setShowPeriodBanner(false)}>
                <Ionicons name="close" size={16} color={COLORS.textSecondary} />
              </Pressable>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.section}>
          <AharText variant="h3" weight="bold">
            Today&apos;s macro progress
          </AharText>
          <AharText variant="caption" color={COLORS.textSecondary}>
            Diet streak updates only when today&apos;s macro goal reaches 100%.
          </AharText>
          <MacroDashboard consumed={consumedMacros} target={targetMacros} />
          {dailyLog && dailyLog.mealLogs.length === 0 ? (
            <AharText variant="caption" color={COLORS.textMuted}>
              Start logging meals to track macros
            </AharText>
          ) : null}
        </View>

        <View style={styles.section}>
          <AharText variant="h3" weight="bold">
            Water tracker
          </AharText>
          <AharText variant="caption" color={COLORS.textSecondary}>
            Use + buttons to add water instantly.
          </AharText>
          <WaterTracker
            consumed={dailyLog?.waterIntakeMl ?? 0}
            goal={profile?.hydrationGoalMl ?? stats?.water.goal ?? 0}
            onAdd={(amount) => {
              void logWater(amount);
            }}
          />
        </View>

        <View style={styles.section}>
          <AharText variant="h3" weight="bold">
            Your streaks 🔥
          </AharText>
          <AharText variant="caption" color={COLORS.textSecondary}>
            Diet streak counts days where macro goal is fully completed.
          </AharText>
          <Pressable
            style={styles.leaderboardLink}
            onPress={() => router.push("/(tabs)/progress/leaderboard" as never)}
          >
            <AharText variant="caption" color={COLORS.secondary}>
              View leaderboard →
            </AharText>
          </Pressable>
          <StreakPanel streaks={streaks} />
        </View>

        {progressStats?.summary.newBadges ? (
          <Pressable
            style={styles.newBadgeBanner}
            onPress={() => router.push("/(tabs)/progress" as never)}
          >
            <AharText variant="label" weight="medium" color={COLORS.accent}>
              You unlocked {progressStats.summary.newBadges} new badge(s)! Tap
              to view.
            </AharText>
          </Pressable>
        ) : null}

        {progressStats?.currentWeek ? (
          <Pressable
            onPress={() => router.push("/(tabs)/progress" as never)}
            style={styles.progressMiniCard}
          >
            <AharText variant="caption" color={COLORS.textSecondary}>
              Last week summary
            </AharText>
            <AharText variant="label" weight="bold">
              {progressStats.currentWeek.headline}
            </AharText>
            <AharText variant="caption" color={COLORS.secondary}>
              Score {progressStats.currentWeek.score} • Weight change{" "}
              {progressStats.summary.weightChangeKg} kg
            </AharText>
          </Pressable>
        ) : null}

        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <AharText variant="h3" weight="bold">
              Today&apos;s meals
            </AharText>
            <Pressable onPress={() => router.push("/(tabs)/plan" as never)}>
              <AharText variant="caption" color={COLORS.secondary}>
                See full plan →
              </AharText>
            </Pressable>
          </View>
          <AharText variant="caption" color={COLORS.textSecondary}>
            Tap a meal card to expand details. Use Done/Skipped to log
            instantly.
          </AharText>

          {topMeals.map((meal) => (
            <MealCard
              key={meal.id}
              meal={meal}
              isExpanded={expandedMealId === meal.id}
              onToggleExpand={() =>
                setExpandedMealId((prev) => (prev === meal.id ? null : meal.id))
              }
              onMarkDone={() => {
                if (!todaysPlan) {
                  return;
                }

                updateMealStatus({
                  planType: "today",
                  mealId: meal.id,
                  status: "done",
                });

                void (async () => {
                  try {
                    await logMeal(meal.id, todaysPlan._id, "done");
                    showToast("Meal logged", "success");
                  } catch {
                    showToast("Could not log meal", "error");
                    await refetchToday();
                  }
                })();
              }}
              onMarkSkipped={() => {
                if (!todaysPlan) {
                  return;
                }

                updateMealStatus({
                  planType: "today",
                  mealId: meal.id,
                  status: "skipped",
                });

                void (async () => {
                  try {
                    await logMeal(meal.id, todaysPlan._id, "skipped");
                    showToast("Meal skipped", "warning");
                  } catch {
                    showToast("Could not skip meal", "error");
                    await refetchToday();
                  }
                })();
              }}
              onGetAlternative={() =>
                showToast("Open Plan page for alternatives", "info")
              }
            />
          ))}

          {(dailyLog?.mealLogs.length ?? 0) === 0 ? (
            <AharText variant="caption" color={COLORS.textMuted}>
              Tap a meal to mark it done
            </AharText>
          ) : null}
        </View>

        <View style={styles.section}>
          <AharText variant="h3" weight="bold">
            Quick log
          </AharText>
          <AharText variant="caption" color={COLORS.textSecondary}>
            Log Water adds 200 ml immediately.
          </AharText>
          <QuickActions
            onWaterLog={() => {
              void logWater(200);
              showToast("Water logged 💧", "success");
            }}
            onGymLog={() => setShowGymLogModal(true)}
            onSleepLog={() => setShowSleepCheckinModal(true)}
            onEnergyLog={() => setShowEnergyCheckinModal(true)}
            onMedicineLog={() => router.push("/(tabs)/settings/medicines")}
          />
        </View>

        {todaysPlan?.prepTasks.length ? (
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <AharText variant="h3" weight="bold">
                Tonight&apos;s prep 🫙
              </AharText>
              <Ionicons
                name="notifications-outline"
                size={16}
                color={COLORS.secondary}
              />
            </View>
            <AharText variant="caption" color={COLORS.textSecondary}>
              Tap checkbox to mark task done. This updates your prep plan.
            </AharText>
            {todaysPlan.prepTasks.slice(0, 3).map((task) => (
              <PrepTaskCard
                key={task.id}
                task={task}
                onToggle={(isDone) => {
                  void (async () => {
                    await updatePrepTask(task.id, isDone);
                    showToast(
                      isDone ? "Prep task completed" : "Prep task reopened",
                      "success",
                    );
                  })();
                }}
              />
            ))}
            {todaysPlan.prepTasks.length > 3 ? (
              <Pressable onPress={() => router.push("/(tabs)/plan" as never)}>
                <AharText variant="caption" color={COLORS.secondary}>
                  See all
                </AharText>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <AharCard elevated style={styles.tipCard}>
          <AharText variant="caption" color={COLORS.textMuted}>
            Tip of the day
          </AharText>
          <View style={styles.tipRow}>
            <Ionicons
              name={tip.icon as keyof typeof Ionicons.glyphMap}
              size={20}
              color={COLORS.secondary}
            />
            <AharText variant="label" style={styles.tipText}>
              {tip.text}
            </AharText>
          </View>
        </AharCard>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 100,
    gap: 24,
  },
  headerCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    marginTop: SPACING.sm,
    gap: SPACING.md,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: SPACING.sm,
  },
  headerLeft: {
    flex: 1,
    gap: SPACING.xs,
  },
  headerBellWrap: {
    paddingTop: SPACING.xs,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  avatarWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: "hidden",
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface2,
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  energyBanner: {
    backgroundColor: COLORS.surface2,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },
  periodBanner: {
    backgroundColor: COLORS.surface2,
    borderColor: COLORS.secondary,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },
  section: {
    gap: SPACING.md,
  },
  leaderboardLink: {
    marginTop: -SPACING.xs,
    marginBottom: -SPACING.xs,
    alignSelf: "flex-start",
  },
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  newBadgeBanner: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.accent,
    backgroundColor: COLORS.surface2,
    padding: SPACING.md,
  },
  progressMiniCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  tipCard: {
    backgroundColor: COLORS.surface2,
    gap: SPACING.sm,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.sm,
  },
  tipText: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
    gap: SPACING.md,
  },
});

export default DashboardScreen;
