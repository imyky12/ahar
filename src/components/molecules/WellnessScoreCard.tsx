import { StyleSheet, View } from "react-native";

import { COLORS, SPACING } from "../../constants";
import { AharCard, AharText } from "../atoms";

export interface WellnessScoreCardProps {
  score: number;
  delta: number;
  note: string;
}

export const WellnessScoreCard = ({
  score,
  delta,
  note,
}: WellnessScoreCardProps) => {
  const deltaPrefix = delta > 0 ? "+" : "";

  return (
    <AharCard>
      <AharText variant="h3" weight="bold">
        Wellness score
      </AharText>
      <AharText variant="caption" color={COLORS.textSecondary}>
        Overall weekly health score based on consistency in meals, hydration,
        sleep, and activity.
      </AharText>
      <View style={styles.row}>
        <AharText variant="h1" weight="bold" color={COLORS.secondary}>
          {Math.round(score)}
        </AharText>
        <AharText
          variant="body"
          color={delta >= 0 ? COLORS.success : COLORS.error}
        >
          {deltaPrefix}
          {delta.toFixed(1)} vs first week
        </AharText>
      </View>
      <AharText variant="body" color={COLORS.textSecondary}>
        {note}
      </AharText>
    </AharCard>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: SPACING.sm,
  },
});

export default WellnessScoreCard;
