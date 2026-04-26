import { View, StyleSheet } from "react-native";
import Svg, { G, Rect, Text as SvgText } from "react-native-svg";

import { COLORS, SPACING } from "../../constants";
import type { WeeklyCheckin } from "../../types";
import { AharCard, AharText } from "../atoms";

export interface MacroHistoryChartProps {
  data: WeeklyCheckin[];
}

const W = 300;
const H = 170;
const PAD = { t: 10, r: 10, b: 30, l: 34 };
const PW = W - PAD.l - PAD.r;
const PH = H - PAD.t - PAD.b;

export const MacroHistoryChart = ({ data }: MacroHistoryChartProps) => {
  const chartData = data.map((item, index) => ({
    index,
    label: item.weekStart.slice(5),
    mealCompliance: Math.round(item.mealComplianceRate),
    hydrationRate: Math.round((item.waterGoalHitDays / 7) * 100),
  }));

  if (!chartData.length) {
    return (
      <AharCard>
        <AharText variant="h3" weight="bold">
          Weekly consistency
        </AharText>
        <AharText variant="caption" color={COLORS.textSecondary}>
          Compares meal compliance and hydration-goal consistency each week.
        </AharText>
        <AharText variant="body" color={COLORS.textSecondary}>
          Weekly meal and hydration consistency will appear here.
        </AharText>
      </AharCard>
    );
  }

  const n = chartData.length;
  const groupW = PW / n;
  const barW = Math.min((groupW * 0.4), 18);
  const gap = Math.min(barW * 0.25, 4);

  const yOf = (v: number) => PAD.t + PH - (v / 100) * PH;

  const yTicks = [0, 25, 50, 75, 100];

  return (
    <AharCard>
      <AharText variant="h3" weight="bold">
        Weekly consistency
      </AharText>
      <AharText variant="caption" color={COLORS.textSecondary}>
        Green bars show meal compliance, coral bars show hydration-goal hit rate.
      </AharText>
      <View style={styles.chart}>
        <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
          {yTicks.map((v) => (
            <G key={v}>
              <SvgText
                x={PAD.l - 4}
                y={yOf(v) + 3.5}
                fontSize={9}
                fill={COLORS.textMuted}
                textAnchor="end"
              >
                {`${v}%`}
              </SvgText>
            </G>
          ))}

          {chartData.map((d) => {
            const cx = PAD.l + d.index * groupW + groupW / 2;
            const x1 = cx - gap / 2 - barW;
            const x2 = cx + gap / 2;

            const mH = (d.mealCompliance / 100) * PH;
            const hH = (d.hydrationRate / 100) * PH;

            return (
              <G key={d.index}>
                {/* meal compliance bar */}
                <Rect
                  x={x1}
                  y={PAD.t + PH - mH}
                  width={barW}
                  height={Math.max(mH, 1)}
                  fill={COLORS.primary}
                  rx={2}
                />
                {/* hydration bar */}
                <Rect
                  x={x2}
                  y={PAD.t + PH - hH}
                  width={barW}
                  height={Math.max(hH, 1)}
                  fill={COLORS.accent}
                  rx={2}
                />
                <SvgText
                  x={cx}
                  y={H - 8}
                  fontSize={9}
                  fill={COLORS.textMuted}
                  textAnchor="middle"
                >
                  {d.label}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: COLORS.primary }]} />
          <AharText variant="caption" color={COLORS.textSecondary}>Meal compliance</AharText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: COLORS.accent }]} />
          <AharText variant="caption" color={COLORS.textSecondary}>Hydration</AharText>
        </View>
      </View>
    </AharCard>
  );
};

const styles = StyleSheet.create({
  chart: {
    height: 170,
    marginTop: SPACING.sm,
  },
  legend: {
    flexDirection: "row",
    gap: SPACING.lg,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

export default MacroHistoryChart;
