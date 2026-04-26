import { StyleSheet, View } from "react-native";

import { CHRONIC_CONDITION_LABELS, COLORS, SPACING } from "../../constants";
import type { ChronicCondition } from "../../types";
import { AharCard, AharChip, AharText } from "../atoms";

interface ConditionCardProps {
  selected: ChronicCondition[];
  onToggle: (condition: ChronicCondition) => void;
  compact?: boolean;
}

export const ConditionCard = ({
  selected,
  onToggle,
  compact = false,
}: ConditionCardProps) => {
  const keys = Object.keys(CHRONIC_CONDITION_LABELS) as ChronicCondition[];

  return (
    <AharCard elevated>
      <AharText weight="bold">Chronic conditions</AharText>
      <AharText variant="caption" color={COLORS.textSecondary}>
        Helps AHAR adjust sodium, glycemic load, and meal timing.
      </AharText>
      <View style={[styles.wrap, compact ? styles.compact : null]}>
        {keys.map((key) => (
          <AharChip
            key={key}
            label={CHRONIC_CONDITION_LABELS[key]}
            selected={selected.includes(key)}
            onPress={() => onToggle(key)}
          />
        ))}
      </View>
    </AharCard>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    gap: SPACING.xs,
    flexWrap: "wrap",
    marginTop: SPACING.sm,
  },
  compact: {
    maxHeight: 180,
  },
});

export default ConditionCard;
