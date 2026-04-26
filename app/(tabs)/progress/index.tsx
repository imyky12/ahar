import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  AharButton,
  AharCard,
  AharText,
  EmptyState,
  SkeletonCard,
} from "../../../src/components/atoms";
import {
  MacroHistoryChart,
  MuscleHeatmap,
  SleepChart,
  WellnessScoreCard,
  WeightChart,
} from "../../../src/components/molecules";
import {
  BadgeGallery,
  WeeklyCheckinForm,
  WeeklyReportCard,
} from "../../../src/components/organisms";
import { COLORS, SPACING } from "../../../src/constants";
import { useProfile, useProgress } from "../../../src/hooks";

const WEIGHT_UNIT_KEY = "ahar_weight_unit";

type ProgressTab = "overview" | "history" | "badges";

export const ProgressScreen = () => {
  const { profile } = useProfile();
  const {
    stats,
    history,
    isLoading,
    isRefetching,
    submitCheckin,
    refresh,
    isSubmittingCheckin,
    markBadgesSeen,
  } = useProgress();

  const [activeTab, setActiveTab] = useState<ProgressTab>("overview");
  const [unit, setUnit] = useState<"kg" | "lb">("kg");
  const [showCheckin, setShowCheckin] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  const contentOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    void AsyncStorage.getItem(WEIGHT_UNIT_KEY).then((stored) => {
      if (stored === "kg" || stored === "lb") {
        setUnit(stored);
      }
    });
  }, []);

  useEffect(() => {
    Animated.timing(contentOpacity, {
      toValue: 0,
      duration: 120,
      useNativeDriver: true,
    }).start(() => {
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
    });
  }, [activeTab, contentOpacity]);

  useEffect(() => {
    if (!stats?.summary.newBadges || activeTab !== "badges") {
      return;
    }

    const timer = setTimeout(() => {
      void markBadgesSeen();
    }, 3000);

    return () => clearTimeout(timer);
  }, [activeTab, markBadgesSeen, stats?.summary.newBadges]);

  useEffect(() => {
    if (!isCheckingStatus) {
      return;
    }

    const interval = setInterval(() => {
      void refresh();
    }, 5000);

    return () => clearInterval(interval);
  }, [isCheckingStatus, refresh]);

  useEffect(() => {
    if (!isCheckingStatus) {
      return;
    }

    if (stats?.currentWeek?.status === "ready") {
      setIsCheckingStatus(false);
    }
  }, [isCheckingStatus, stats?.currentWeek?.status]);

  const toggleUnit = async (): Promise<void> => {
    const next = unit === "kg" ? "lb" : "kg";
    setUnit(next);
    await AsyncStorage.setItem(WEIGHT_UNIT_KEY, next);
  };

  const convertWeight = (kg: number): number => {
    return unit === "kg" ? kg : kg * 2.20462;
  };

  const musclePoints = useMemo(() => {
    const latest = stats?.currentWeek;
    if (!latest) {
      return [];
    }

    return [
      {
        muscle: "Chest",
        count: latest.gymDaysActual >= 3 ? 3 : latest.gymDaysActual,
      },
      {
        muscle: "Back",
        count: latest.gymDaysActual >= 2 ? 2 : latest.gymDaysActual,
      },
      {
        muscle: "Legs",
        count: latest.gymDaysActual >= 4 ? 4 : latest.gymDaysActual,
      },
      { muscle: "Shoulders", count: latest.gymDaysActual >= 2 ? 2 : 1 },
      { muscle: "Arms", count: latest.gymDaysActual >= 3 ? 3 : 1 },
      { muscle: "Core", count: latest.gymDaysActual >= 2 ? 2 : 1 },
    ];
  }, [stats?.currentWeek]);

  if (isLoading && !stats) {
    return (
      <View style={styles.centered}>
        <SkeletonCard lines={4} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <WeeklyCheckinForm
        visible={showCheckin}
        initialWeight={profile?.weight ?? stats?.currentWeek?.weight ?? 70}
        isSubmitting={isSubmittingCheckin}
        onClose={() => setShowCheckin(false)}
        onSubmit={async (weight) => {
          await submitCheckin(weight);
          setShowCheckin(false);
          setIsCheckingStatus(true);
        }}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refresh()}
            tintColor={COLORS.primary}
          />
        }
      >
        <View style={styles.headerRow}>
          <AharText variant="h2" weight="bold">
            Progress
          </AharText>
          <View style={styles.headerActions}>
            <AharButton
              label={`Unit: ${unit.toUpperCase()}`}
              size="sm"
              variant="secondary"
              onPress={() => void toggleUnit()}
            />
            <AharButton
              label="Weekly check-in"
              size="sm"
              onPress={() => setShowCheckin(true)}
            />
          </View>
        </View>

        <View style={styles.tabRow}>
          {(["overview", "history", "badges"] as ProgressTab[]).map((tab) => (
            <Pressable
              key={tab}
              style={[
                styles.tabButton,
                activeTab === tab ? styles.tabButtonActive : null,
              ]}
              onPress={() => setActiveTab(tab)}
            >
              <AharText
                variant="label"
                weight="medium"
                color={
                  activeTab === tab ? COLORS.textPrimary : COLORS.textSecondary
                }
              >
                {tab[0].toUpperCase() + tab.slice(1)}
              </AharText>
            </Pressable>
          ))}
        </View>

        <Animated.View style={{ opacity: contentOpacity, gap: SPACING.md }}>
          {activeTab === "overview" ? (
            <>
              {stats?.currentWeek ? (
                <>
                  <WellnessScoreCard
                    score={stats.currentWeek.score}
                    delta={stats.summary.scoreDelta}
                    note={
                      stats.currentWeek.status === "generating"
                        ? "Generating your latest weekly summary..."
                        : stats.currentWeek.aiSummary
                    }
                  />
                  <WeeklyReportCard report={stats.currentWeek} />
                </>
              ) : (
                <AharCard>
                  <AharText variant="h3" weight="bold">
                    No weekly report yet
                  </AharText>
                  <AharText variant="caption" color={COLORS.textSecondary}>
                    Weekly reports summarize your adherence, recovery, and trend
                    changes.
                  </AharText>
                  <AharText variant="body" color={COLORS.textSecondary}>
                    Submit your weekly check-in to generate your first progress
                    report.
                  </AharText>
                </AharCard>
              )}

              <WeightChart
                data={stats?.weightLogs ?? []}
                unitLabel={unit}
                convertWeight={convertWeight}
              />
              <MacroHistoryChart data={stats?.weeklyHistory ?? []} />
              <SleepChart data={stats?.weeklyHistory ?? []} />
              <MuscleHeatmap points={musclePoints} />
            </>
          ) : null}

          {activeTab === "history" ? (
            <>
              {(history?.weeklyCheckins ?? []).map((item) => (
                <AharCard key={item._id}>
                  <AharText variant="label" weight="bold">
                    {item.weekStart} → {item.weekEnd}
                  </AharText>
                  <AharText variant="caption" color={COLORS.textSecondary}>
                    Snapshot of that week showing score, compliance, and body
                    weight.
                  </AharText>
                  <AharText variant="body" color={COLORS.textSecondary}>
                    Score: {item.score} • Meal compliance:{" "}
                    {Math.round(item.mealComplianceRate)}%
                  </AharText>
                  <AharText variant="caption" color={COLORS.textMuted}>
                    Weight: {convertWeight(item.weight).toFixed(1)} {unit}
                  </AharText>
                </AharCard>
              ))}
              {!(history?.weeklyCheckins ?? []).length ? (
                <EmptyState
                  icon="analytics"
                  title="No reports yet"
                  subtitle="Complete your first week"
                />
              ) : null}
            </>
          ) : null}

          {activeTab === "badges" ? (
            <BadgeGallery badges={stats?.badges ?? []} />
          ) : null}
        </Animated.View>
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
    padding: SPACING.lg,
    paddingBottom: 120,
    gap: SPACING.md,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: SPACING.sm,
  },
  headerActions: {
    flexDirection: "row",
    gap: SPACING.sm,
    alignItems: "center",
  },
  tabRow: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: SPACING.xs,
    gap: SPACING.xs,
  },
  tabButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: SPACING.sm,
    alignItems: "center",
  },
  tabButtonActive: {
    backgroundColor: COLORS.surface2,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
    gap: SPACING.md,
  },
});

export default ProgressScreen;
