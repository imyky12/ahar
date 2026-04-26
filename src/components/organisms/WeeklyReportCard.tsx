import { StyleSheet, View } from "react-native";

import { COLORS, SPACING } from "../../constants";
import type { WeeklyCheckin } from "../../types";
import { AharCard, AharText } from "../atoms";

export interface WeeklyReportCardProps {
  report: WeeklyCheckin;
}

export const WeeklyReportCard = ({ report }: WeeklyReportCardProps) => {
  return (
    <AharCard>
      <AharText variant="h3" weight="bold">
        {report.headline || "Weekly summary"}
      </AharText>
      <AharText variant="caption" color={COLORS.textSecondary}>
        AI-generated weekly review with your key wins, adjustments, and next
        focus area.
      </AharText>
      <AharText variant="caption" color={COLORS.textSecondary}>
        {report.weekStart} → {report.weekEnd}
      </AharText>
      <AharText variant="body" color={COLORS.textPrimary}>
        {report.aiSummary}
      </AharText>

      <View style={styles.section}>
        <AharText variant="label" weight="bold">
          Wins
        </AharText>
        {report.wins.map((item) => (
          <AharText key={item} variant="body" color={COLORS.secondary}>
            • {item}
          </AharText>
        ))}
      </View>

      <View style={styles.section}>
        <AharText variant="label" weight="bold">
          Adjustments
        </AharText>
        {report.adjustments.map((item) => (
          <AharText key={item} variant="body" color={COLORS.accent}>
            • {item}
          </AharText>
        ))}
      </View>

      <AharText variant="body" color={COLORS.textSecondary}>
        Focus: {report.focusTip}
      </AharText>
      <AharText variant="body" color={COLORS.primary}>
        {report.motivationalNote}
      </AharText>
    </AharCard>
  );
};

const styles = StyleSheet.create({
  section: {
    marginTop: SPACING.md,
    gap: SPACING.xs,
  },
});

export default WeeklyReportCard;
