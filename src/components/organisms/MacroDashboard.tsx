import { StyleSheet, View } from "react-native";

import { BORDER_RADIUS, COLORS, SPACING } from "../../constants";
import type { Macros } from "../../types";
import { AharCard, AharProgressBar, AharText } from "../atoms";

export interface MacroDashboardProps {
  consumed: Macros;
  target: Macros;
}

const MacroRow = ({
  label,
  consumed,
  target,
}: {
  label: string;
  consumed: number;
  target: number;
}) => {
  const ratio = target > 0 ? consumed / target : 0;
  const progress = Math.max(0, Math.min(1, ratio));

  return (
    <View style={styles.rowWrap}>
      <View style={styles.rowHead}>
        <AharText variant="label" weight="medium">
          {label}
        </AharText>
        <AharText variant="caption" color={COLORS.textSecondary}>
          {Math.round(consumed)}g / {Math.round(target)}g
        </AharText>
      </View>
      <AharProgressBar progress={progress} />
    </View>
  );
};

export const MacroDashboard = ({ consumed, target }: MacroDashboardProps) => {
  const remaining = Math.round(target.calories - consumed.calories);

  return (
    <View style={styles.container}>
      <MacroRow
        label="Protein"
        consumed={consumed.protein}
        target={target.protein}
      />
      <MacroRow label="Carbs" consumed={consumed.carbs} target={target.carbs} />
      <MacroRow label="Fat" consumed={consumed.fat} target={target.fat} />

      <AharCard elevated style={styles.calorieCard}>
        <AharText variant="h1" weight="bold">
          {Math.round(consumed.calories)}
        </AharText>
        <AharText variant="caption" color={COLORS.textSecondary}>
          / {Math.round(target.calories)} kcal
        </AharText>
        <AharText
          variant="label"
          color={remaining >= 0 ? COLORS.textSecondary : COLORS.error}
        >
          {remaining >= 0
            ? `Remaining: ${remaining} kcal`
            : `Over by: ${Math.abs(remaining)} kcal`}
        </AharText>
      </AharCard>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: SPACING.md,
  },
  rowWrap: {
    gap: SPACING.xs,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    padding: SPACING.md,
  },
  rowHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  calorieCard: {
    alignItems: "center",
    gap: SPACING.xs,
  },
});

export default MacroDashboard;
