import { useEffect, useMemo, useRef } from "react";
import { Animated, ScrollView, StyleSheet, View } from "react-native";

import { BORDER_RADIUS, COLORS, SPACING } from "../../constants";
import type { Meal } from "../../types";
import { AharText } from "../atoms";
import { MealCard } from "../molecules";

export interface DayTimelineProps {
  meals: Meal[];
  currentTime: string;
  onMealAction: (
    mealId: string,
    action: "done" | "skipped" | "alternative" | "expand",
  ) => void;
}

const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

export const DayTimeline = ({
  meals,
  currentTime,
  onMealAction,
}: DayTimelineProps) => {
  const scrollRef = useRef<ScrollView>(null);
  const pulse = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.6,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [pulse]);

  const sorted = useMemo(
    () => meals.slice().sort((a, b) => a.timeSlot.localeCompare(b.timeSlot)),
    [meals],
  );
  const currentMins = toMinutes(currentTime);
  const nowIndex = Math.max(
    0,
    sorted.findIndex((meal) => toMinutes(meal.timeSlot) >= currentMins),
  );

  useEffect(() => {
    const targetY = Math.max(0, nowIndex * 160 - 180);
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: targetY, animated: true });
    }, 150);
  }, [nowIndex]);

  return (
    <ScrollView ref={scrollRef} contentContainerStyle={styles.container}>
      <View style={styles.verticalLine} />
      {sorted.map((meal, index) => {
        const isPast = toMinutes(meal.timeSlot) < currentMins;
        const isSkipped = meal.status === "skipped";
        const isDone = meal.status === "done";

        return (
          <View key={meal.id} style={styles.row}>
            <View style={styles.timeCol}>
              <AharText variant="caption" color={COLORS.textSecondary}>
                {meal.timeSlot}
              </AharText>
            </View>

            <View style={styles.dotCol}>
              <View
                style={[
                  styles.dot,
                  isDone
                    ? styles.doneDot
                    : isSkipped
                      ? styles.skippedDot
                      : null,
                ]}
              />
            </View>

            <View
              style={[
                styles.cardCol,
                isPast && isSkipped ? styles.muted : null,
              ]}
            >
              <MealCard
                meal={meal}
                onMarkDone={() => onMealAction(meal.id, "done")}
                onMarkSkipped={() => onMealAction(meal.id, "skipped")}
                onGetAlternative={() => onMealAction(meal.id, "alternative")}
                isExpanded={false}
                onToggleExpand={() => onMealAction(meal.id, "expand")}
              />
            </View>

            {index === nowIndex ? (
              <View style={styles.nowLineWrap}>
                <View style={styles.nowLine} />
                <Animated.View style={[styles.nowDot, { opacity: pulse }]} />
                <AharText variant="caption" color={COLORS.secondary}>
                  Now
                </AharText>
              </View>
            ) : null}
          </View>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: SPACING.huge,
    gap: SPACING.md,
  },
  verticalLine: {
    position: "absolute",
    left: 76,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: COLORS.border,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.sm,
    minHeight: 144,
  },
  timeCol: {
    width: 56,
    alignItems: "flex-end",
    paddingTop: SPACING.md,
  },
  dotCol: {
    width: 24,
    alignItems: "center",
    paddingTop: SPACING.lg,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.textMuted,
  },
  doneDot: {
    backgroundColor: COLORS.success,
  },
  skippedDot: {
    backgroundColor: COLORS.error,
  },
  cardCol: {
    flex: 1,
  },
  muted: {
    opacity: 0.72,
  },
  nowLineWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  nowLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.secondary,
  },
  nowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.secondary,
  },
});

export default DayTimeline;
