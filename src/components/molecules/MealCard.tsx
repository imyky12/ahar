import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import { LayoutAnimation, Pressable, StyleSheet, View } from "react-native";

import type { Meal } from "../../types";
import { BORDER_RADIUS, COLORS, SPACING } from "../../constants";
import { AharButton, AharCard, AharText } from "../atoms";

export interface MealCardProps {
  meal: Meal;
  onMarkDone: () => void;
  onMarkSkipped: () => void;
  onGetAlternative: () => void;
  isExpanded?: boolean;
  onToggleExpand: () => void;
}

const statusIcon = (status: Meal["status"]) => {
  if (status === "done") {
    return { name: "checkmark-circle", color: COLORS.success } as const;
  }

  if (status === "skipped") {
    return { name: "close-circle", color: COLORS.error } as const;
  }

  if (status === "alternative") {
    return { name: "swap-horizontal", color: COLORS.accent } as const;
  }

  return { name: "time-outline", color: COLORS.textSecondary } as const;
};

export const MealCard = ({
  meal,
  onMarkDone,
  onMarkSkipped,
  onGetAlternative,
  isExpanded = false,
  onToggleExpand,
}: MealCardProps) => {
  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [isExpanded]);

  const icon = statusIcon(meal.status);

  return (
    <AharCard
      elevated
      style={[
        styles.card,
        meal.status === "done" ? styles.doneCard : null,
        meal.status === "skipped" ? styles.skippedCard : null,
      ]}
    >
      <Pressable onPress={onToggleExpand} style={styles.row}>
        <View style={styles.timeBadge}>
          <AharText variant="caption" weight="bold" color={COLORS.textPrimary}>
            {meal.timeSlot}
          </AharText>
        </View>

        <View style={styles.center}>
          <AharText variant="body" weight="bold">
            {meal.label}
          </AharText>
          <AharText variant="caption" color={COLORS.textSecondary}>
            {meal.totalMacros.calories} kcal
          </AharText>
        </View>

        <Ionicons name={icon.name} size={22} color={icon.color} />
      </Pressable>

      {isExpanded ? (
        <View style={styles.expanded}>
          {meal.items.map((item) => (
            <View key={`${meal.id}-${item.name}`} style={styles.itemRow}>
              <View style={styles.itemTextWrap}>
                <AharText variant="label" weight="medium">
                  {item.name}
                </AharText>
                <AharText variant="caption" color={COLORS.textSecondary}>
                  {item.quantity} {item.unit} · {item.macros.calories} kcal ·{" "}
                  {item.cookTimeMinutes} min
                </AharText>
              </View>
            </View>
          ))}

          <View style={styles.macroRow}>
            <View
              style={[styles.macroChip, { backgroundColor: COLORS.primary }]}
            >
              <AharText variant="caption" color={COLORS.textPrimary}>
                P: {meal.totalMacros.protein}g
              </AharText>
            </View>
            <View
              style={[styles.macroChip, { backgroundColor: COLORS.accent }]}
            >
              <AharText variant="caption" color={COLORS.textPrimary}>
                C: {meal.totalMacros.carbs}g
              </AharText>
            </View>
            <View
              style={[styles.macroChip, { backgroundColor: COLORS.warning }]}
            >
              <AharText variant="caption" color={COLORS.background}>
                F: {meal.totalMacros.fat}g
              </AharText>
            </View>
          </View>

          <View style={styles.prepRow}>
            <Ionicons
              name="time-outline"
              size={16}
              color={COLORS.textSecondary}
            />
            <AharText variant="caption" color={COLORS.textSecondary}>
              Total prep time: {meal.prepTimeMinutes} min
            </AharText>
          </View>

          <View style={styles.actionRow}>
            <AharButton label="Done" size="sm" onPress={onMarkDone} />
            <AharButton
              label="Skipped"
              size="sm"
              variant="ghost"
              onPress={onMarkSkipped}
            />
            <AharButton
              label="Not available"
              size="sm"
              variant="ghost"
              onPress={onGetAlternative}
            />
          </View>
        </View>
      ) : null}
    </AharCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  doneCard: {
    borderColor: COLORS.success,
  },
  skippedCard: {
    opacity: 0.7,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
  timeBadge: {
    minWidth: 64,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.button,
    backgroundColor: COLORS.primary,
  },
  center: {
    flex: 1,
    gap: SPACING.xs,
  },
  expanded: {
    gap: SPACING.sm,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemTextWrap: {
    flex: 1,
  },
  macroRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  macroChip: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.button,
  },
  prepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  actionRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    flexWrap: "wrap",
  },
});

export default MealCard;
