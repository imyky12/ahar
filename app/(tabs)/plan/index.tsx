import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { format } from "date-fns";
import { useCallback, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ActivityIndicator,
  Modal,
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
  useToast,
} from "../../../src/components/atoms";
import {
  GroceryItemCard,
  MacroRing,
  MealCard,
  PrepTaskCard,
} from "../../../src/components/molecules";
import { BORDER_RADIUS, COLORS, SPACING } from "../../../src/constants";
import { QUERY_KEYS } from "../../../src/constants/queryKeys";
import { useDailyLog, usePlan, useProfile } from "../../../src/hooks";
import { usePlanStore } from "../../../src/stores";
import type { DietPlan, FoodItem, Meal } from "../../../src/types";

export const PlanScreen = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<"today" | "tomorrow">("today");
  const [expandedMealId, setExpandedMealId] = useState<string | null>(null);
  const [alternativeMeal, setAlternativeMeal] = useState<Meal | null>(null);
  const [alternatives, setAlternatives] = useState<FoodItem[][]>([]);
  const [isAlternativeLoading, setIsAlternativeLoading] = useState(false);
  const [showSkipReasons, setShowSkipReasons] = useState(false);

  const {
    todaysPlan,
    tomorrowsPlan,
    isLoadingToday,
    isLoadingTomorrow,
    triggerGeneration,
    updatePrepTask,
    error,
  } = usePlan();
  const { profile } = useProfile();
  const { logMeal, skipWithAlternative } = useDailyLog();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const updateMealStatus = usePlanStore((state) => state.updateMealStatus);
  const setPlanInStore = usePlanStore((state) => state.setPlan);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.plans.today }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.plans.tomorrow }),
    ]);
    setIsRefreshing(false);
  }, [queryClient]);

  const plan = activeTab === "today" ? todaysPlan : tomorrowsPlan;
  const isLoading = activeTab === "today" ? isLoadingToday : isLoadingTomorrow;

  const sortedMeals = useMemo(() => {
    return (plan?.meals ?? [])
      .slice()
      .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));
  }, [plan?.meals]);

  const consumedMacros = useMemo(() => {
    const meals = todaysPlan?.meals ?? [];
    const doneMeals = meals.filter((meal) => meal.status === "done");

    return doneMeals.reduce(
      (acc, meal) => ({
        protein: acc.protein + meal.totalMacros.protein,
        carbs: acc.carbs + meal.totalMacros.carbs,
        fat: acc.fat + meal.totalMacros.fat,
        calories: acc.calories + meal.totalMacros.calories,
      }),
      { protein: 0, carbs: 0, fat: 0, calories: 0 },
    );
  }, [todaysPlan?.meals]);

  const doneMealsCount = useMemo(() => {
    return (todaysPlan?.meals ?? []).filter((meal) => meal.status === "done")
      .length;
  }, [todaysPlan?.meals]);

  const dedupeAlternatives = (options: FoodItem[][]): FoodItem[][] => {
    const seen = new Set<string>();
    const unique: FoodItem[][] = [];

    options.forEach((option) => {
      const signature = option
        .map((item) => `${item.name}-${item.quantity}-${item.unit}`)
        .sort()
        .join("|");

      if (!seen.has(signature)) {
        seen.add(signature);
        unique.push(option);
      }
    });

    return unique;
  };

  const onGetAlternative = async (
    meal: Meal,
    reason: "not_available" | "not_eaten" | "disliked",
  ) => {
    if (!todaysPlan || activeTab !== "today") {
      return;
    }

    setAlternativeMeal(meal);
    setShowSkipReasons(false);
    setIsAlternativeLoading(true);

    try {
      const response = await skipWithAlternative(
        meal.id,
        todaysPlan._id,
        reason,
      );

      setAlternatives(dedupeAlternatives(response));
    } catch {
      showToast("Could not fetch alternatives", "error");
      setAlternatives([]);
    } finally {
      setIsAlternativeLoading(false);
    }
  };

  const useAlternative = async (items: FoodItem[]) => {
    if (!alternativeMeal || !todaysPlan || activeTab !== "today") {
      return;
    }

    updateMealStatus({
      planType: activeTab,
      mealId: alternativeMeal.id,
      status: "alternative",
      alternativeTaken: items,
    });

    try {
      await logMeal(alternativeMeal.id, todaysPlan._id, "alternative", items);
      showToast("Alternative meal logged", "success");
      setAlternativeMeal(null);
      setAlternatives([]);
    } catch {
      showToast("Could not log alternative meal", "error");
    }
  };

  const offlineBanner = error && (todaysPlan || tomorrowsPlan);

  const statTarget =
    profile?.macros ?? todaysPlan?.totalMacros ?? consumedMacros;

  const dateLabel = format(
    activeTab === "tomorrow" ? new Date(Date.now() + 86400000) : new Date(),
    "EEEE d MMM",
  );

  const toggleGroceryAvailability = (name: string) => {
    if (!plan) {
      return;
    }

    const targetKey =
      activeTab === "today"
        ? QUERY_KEYS.plans.today
        : QUERY_KEYS.plans.tomorrow;

    queryClient.setQueryData<DietPlan | undefined>(targetKey, (prev) => {
      if (!prev) {
        return prev;
      }

      return {
        ...prev,
        groceryList: prev.groceryList.map((entry) =>
          entry.name === name
            ? { ...entry, isAvailable: !entry.isAvailable }
            : entry,
        ),
      };
    });

    const cached = queryClient.getQueryData<DietPlan>(targetKey);
    if (cached) {
      setPlanInStore({ type: activeTab, plan: cached });
    }
  };

  const renderSkeletons = () => {
    return [1, 2, 3].map((item) => <SkeletonCard key={item} lines={4} />);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void onRefresh()}
            tintColor={COLORS.primary}
          />
        }
      >
        <AharText variant="h2" weight="bold">
          {activeTab === "today" ? "Today" : "Tomorrow"}, {dateLabel}
        </AharText>

        <MacroRing macros={consumedMacros} target={statTarget} size="md" />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.statRow}
        >
          <AharCard style={styles.statCard}>
            <AharText variant="caption" color={COLORS.textSecondary}>
              Calories
            </AharText>
            <AharText variant="body" weight="bold">
              {consumedMacros.calories}/{statTarget.calories}
            </AharText>
          </AharCard>
          <AharCard style={styles.statCard}>
            <AharText variant="caption" color={COLORS.textSecondary}>
              Protein
            </AharText>
            <AharText variant="body" weight="bold">
              {consumedMacros.protein}g/{statTarget.protein}g
            </AharText>
          </AharCard>
          <AharCard style={styles.statCard}>
            <AharText variant="caption" color={COLORS.textSecondary}>
              Water
            </AharText>
            <AharText variant="body" weight="bold">
              {profile?.hydrationGoalMl ?? 0}ml
            </AharText>
          </AharCard>
          <AharCard style={styles.statCard}>
            <AharText variant="caption" color={COLORS.textSecondary}>
              Meals
            </AharText>
            <AharText variant="body" weight="bold">
              {doneMealsCount}/{todaysPlan?.meals.length ?? 0}
            </AharText>
          </AharCard>
        </ScrollView>

        <View style={styles.tabRow}>
          <Pressable style={styles.tab} onPress={() => setActiveTab("today")}>
            <AharText
              weight="bold"
              color={
                activeTab === "today"
                  ? COLORS.textPrimary
                  : COLORS.textSecondary
              }
            >
              Today
            </AharText>
            {activeTab === "today" ? (
              <View style={styles.tabUnderline} />
            ) : null}
          </Pressable>
          <Pressable
            style={styles.tab}
            onPress={() => setActiveTab("tomorrow")}
          >
            <AharText
              weight="bold"
              color={
                activeTab === "tomorrow"
                  ? COLORS.textPrimary
                  : COLORS.textSecondary
              }
            >
              Tomorrow
            </AharText>
            {activeTab === "tomorrow" ? (
              <View style={styles.tabUnderline} />
            ) : null}
          </Pressable>
        </View>

        {offlineBanner ? (
          <AharCard style={styles.warningBanner}>
            <AharText variant="caption" color={COLORS.warning}>
              Showing offline plan
            </AharText>
          </AharCard>
        ) : null}

        {isLoading ? renderSkeletons() : null}

        {!isLoading && !plan ? (
          <EmptyState
            icon="nutrition"
            title="No plan yet"
            subtitle="Your plan generates nightly"
            action={{ label: "Generate now", onPress: triggerGeneration }}
          />
        ) : null}

        {!isLoading && plan ? (
          <>
            {plan.prepTasks.length ? (
              <View style={styles.section}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons
                    name="notifications-outline"
                    size={18}
                    color={COLORS.secondary}
                  />
                  <AharText variant="h3" weight="bold">
                    Tonight's prep
                  </AharText>
                </View>
                {plan.prepTasks.map((task) => (
                  <PrepTaskCard
                    key={task.id}
                    task={task}
                    onToggle={(isDone) => {
                      void updatePrepTask(task.id, isDone);
                    }}
                  />
                ))}
              </View>
            ) : null}

            <View style={styles.section}>
              <AharText variant="h3" weight="bold">
                {activeTab === "today"
                  ? "Your meals today"
                  : "Tomorrow meal preview"}
              </AharText>
              {sortedMeals.map((meal) => (
                <MealCard
                  key={meal.id}
                  meal={meal}
                  isExpanded={
                    activeTab === "today" ? expandedMealId === meal.id : false
                  }
                  onToggleExpand={() => {
                    if (activeTab !== "today") {
                      return;
                    }

                    setExpandedMealId((prev) =>
                      prev === meal.id ? null : meal.id,
                    );
                  }}
                  onMarkDone={() =>
                    void (async () => {
                      if (!todaysPlan || activeTab !== "today") {
                        return;
                      }

                      updateMealStatus({
                        planType: "today",
                        mealId: meal.id,
                        status: "done",
                      });

                      try {
                        await logMeal(meal.id, todaysPlan._id, "done");
                        void Haptics.notificationAsync(
                          Haptics.NotificationFeedbackType.Success,
                        );
                        showToast("Meal logged! ✓", "success");
                      } catch {
                        showToast("Could not log meal", "error");
                      }
                    })()
                  }
                  onMarkSkipped={() => {
                    if (!todaysPlan || activeTab !== "today") {
                      return;
                    }

                    void Haptics.impactAsync(
                      Haptics.ImpactFeedbackStyle.Medium,
                    );

                    setAlternativeMeal(meal);
                    setAlternatives([]);
                    setShowSkipReasons(true);
                  }}
                  onGetAlternative={() => {
                    void onGetAlternative(meal, "not_available");
                  }}
                />
              ))}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Ionicons
                  name="cart-outline"
                  size={18}
                  color={COLORS.secondary}
                />
                <AharText variant="h3" weight="bold">
                  {activeTab === "today"
                    ? "Today's grocery list"
                    : "Tomorrow's grocery list"}
                </AharText>
                {activeTab === "tomorrow" ? (
                  <Pressable onPress={() => void triggerGeneration()}>
                    <Ionicons
                      name="refresh-outline"
                      size={18}
                      color={COLORS.textSecondary}
                    />
                  </Pressable>
                ) : null}
              </View>
              {activeTab === "tomorrow" ? (
                <AharText variant="caption" color={COLORS.textSecondary}>
                  Plan generated at {format(new Date(plan.generatedAt), "p")}
                </AharText>
              ) : null}
              {plan.groceryList.map((item) => (
                <GroceryItemCard
                  key={`${plan.date}-${item.name}`}
                  item={item}
                  onToggleAvailable={() => toggleGroceryAvailability(item.name)}
                />
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>

      <Modal
        visible={Boolean(alternativeMeal)}
        transparent
        animationType="slide"
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={styles.modalOverlay}
            onPress={() => {
              setAlternativeMeal(null);
              setAlternatives([]);
              setShowSkipReasons(false);
            }}
          />
          <View style={styles.modalCard}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeader}>
              <AharText variant="h3" weight="bold">
                {showSkipReasons
                  ? "Why are you skipping?"
                  : `Quick alternatives for ${alternativeMeal?.label ?? "this meal"}`}
              </AharText>
              <Pressable
                onPress={() => {
                  setAlternativeMeal(null);
                  setAlternatives([]);
                  setShowSkipReasons(false);
                }}
              >
                <Ionicons name="close" size={22} color={COLORS.textPrimary} />
              </Pressable>
            </View>

            {showSkipReasons ? (
              <View style={styles.reasonActions}>
                <AharButton
                  label="Not hungry"
                  variant="secondary"
                  onPress={() => {
                    if (!alternativeMeal || !todaysPlan) {
                      return;
                    }

                    updateMealStatus({
                      planType: "today",
                      mealId: alternativeMeal.id,
                      status: "skipped",
                    });

                    void (async () => {
                      try {
                        await logMeal(
                          alternativeMeal.id,
                          todaysPlan._id,
                          "skipped",
                        );
                        showToast("Meal skipped", "warning");
                      } catch {
                        showToast("Could not skip meal", "error");
                      } finally {
                        setAlternativeMeal(null);
                        setShowSkipReasons(false);
                      }
                    })();
                  }}
                />
                <AharButton
                  label="Item not available"
                  variant="secondary"
                  onPress={() => {
                    if (!alternativeMeal) {
                      return;
                    }

                    void onGetAlternative(alternativeMeal, "not_available");
                  }}
                />
                <AharButton
                  label="Didn't like it"
                  variant="secondary"
                  onPress={() => {
                    if (!alternativeMeal) {
                      return;
                    }

                    void onGetAlternative(alternativeMeal, "disliked");
                  }}
                />
              </View>
            ) : null}

            {isAlternativeLoading ? (
              <ActivityIndicator color={COLORS.primary} />
            ) : null}

            {!isAlternativeLoading && alternatives.length ? (
              <ScrollView>
                {alternatives.map((option, index) => {
                  const total = option.reduce(
                    (acc, item) => ({
                      protein: acc.protein + item.macros.protein,
                      carbs: acc.carbs + item.macros.carbs,
                      fat: acc.fat + item.macros.fat,
                      calories: acc.calories + item.macros.calories,
                    }),
                    { protein: 0, carbs: 0, fat: 0, calories: 0 },
                  );

                  return (
                    <AharCard key={`alt-${index}`} style={styles.altCard}>
                      <AharText weight="bold">Option {index + 1}</AharText>
                      <AharText variant="caption" color={COLORS.textSecondary}>
                        {option.map((item) => item.name).join(", ")}
                      </AharText>
                      <AharText variant="caption" color={COLORS.textSecondary}>
                        P {total.protein}g · C {total.carbs}g · F {total.fat}g ·{" "}
                        {total.calories} kcal
                      </AharText>
                      <AharButton
                        label="Use this"
                        size="sm"
                        onPress={() => {
                          void useAlternative(option);
                        }}
                      />
                    </AharCard>
                  );
                })}
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
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
  content: {
    padding: SPACING.xxl,
    gap: SPACING.md,
    paddingBottom: 100,
  },
  statRow: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  statCard: {
    minWidth: 130,
    marginRight: SPACING.sm,
  },
  tabRow: {
    flexDirection: "row",
    gap: SPACING.xxl,
    marginTop: SPACING.sm,
  },
  tab: {
    gap: SPACING.xs,
  },
  tabUnderline: {
    height: 2,
    borderRadius: BORDER_RADIUS.input,
    backgroundColor: COLORS.primary,
  },
  warningBanner: {
    backgroundColor: "rgba(244,162,97,0.15)",
    borderColor: COLORS.warning,
  },
  skeletonCard: {
    height: 96,
    overflow: "hidden",
    marginBottom: SPACING.md,
  },
  shimmer: {
    width: 120,
    height: "100%",
    backgroundColor: "rgba(255,255,255,0.09)",
  },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.md,
    paddingVertical: SPACING.xxxl,
  },
  section: {
    marginTop: SPACING.lg,
    gap: SPACING.sm,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: COLORS.overlay45,
    justifyContent: "flex-end",
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    maxHeight: "72%",
    backgroundColor: COLORS.surface2,
    borderTopLeftRadius: BORDER_RADIUS.card,
    borderTopRightRadius: BORDER_RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xxl,
    gap: SPACING.md,
  },
  dragHandle: {
    alignSelf: "center",
    width: 48,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.md,
  },
  reasonActions: {
    gap: SPACING.sm,
  },
  altCard: {
    marginBottom: SPACING.sm,
    gap: SPACING.xs,
  },
});

export default PlanScreen;
