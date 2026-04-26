import { StyleSheet, View } from "react-native";

import { COLORS, SPACING } from "../../constants";
import { AharCard, AharText } from "../atoms";

export interface MuscleHeatmapPoint {
  muscle: string;
  count: number;
}

export interface MuscleHeatmapProps {
  points: MuscleHeatmapPoint[];
}

const intensityColor = (count: number): string => {
  if (count >= 5) {
    return COLORS.secondary;
  }

  if (count >= 3) {
    return COLORS.primary;
  }

  if (count >= 1) {
    return COLORS.surface2;
  }

  return COLORS.surface;
};

export const MuscleHeatmap = ({ points }: MuscleHeatmapProps) => {
  if (!points.length) {
    return (
      <AharCard>
        <AharText variant="h3" weight="bold">
          Muscle heatmap
        </AharText>
        <AharText variant="caption" color={COLORS.textSecondary}>
          Visual view of how frequently each muscle group was trained.
        </AharText>
        <AharText variant="body" color={COLORS.textSecondary}>
          Log gym sessions to populate this heatmap.
        </AharText>
      </AharCard>
    );
  }

  return (
    <AharCard>
      <AharText variant="h3" weight="bold">
        Muscle heatmap
      </AharText>
      <AharText variant="caption" color={COLORS.textSecondary}>
        Brighter tiles mean higher weekly training frequency for that muscle.
      </AharText>
      <View style={styles.grid}>
        {points.map((point) => (
          <View
            key={point.muscle}
            style={[
              styles.tile,
              { backgroundColor: intensityColor(point.count) },
            ]}
          >
            <AharText variant="caption" color={COLORS.textPrimary}>
              {point.muscle}
            </AharText>
            <AharText variant="caption" color={COLORS.textSecondary}>
              {point.count}x
            </AharText>
          </View>
        ))}
      </View>
    </AharCard>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  tile: {
    width: "30%",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.sm,
    gap: SPACING.xs,
  },
});

export default MuscleHeatmap;
