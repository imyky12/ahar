import { View, StyleSheet } from "react-native";
import Svg, {
  Circle,
  G,
  Line as SvgLine,
  Path,
  Text as SvgText,
} from "react-native-svg";

import { COLORS, SPACING } from "../../constants";
import type { WeightLog } from "../../types";
import { AharCard, AharText } from "../atoms";

export interface WeightChartProps {
  data: WeightLog[];
  unitLabel: "kg" | "lb";
  convertWeight: (kg: number) => number;
}

const W = 300;
const H = 155;
const PAD = { t: 10, r: 10, b: 30, l: 38 };
const PW = W - PAD.l - PAD.r;
const PH = H - PAD.t - PAD.b;

const linePath = (pts: { x: number; y: number }[]): string =>
  pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");

export const WeightChart = ({
  data,
  unitLabel,
  convertWeight,
}: WeightChartProps) => {
  const chartData = data.map((item, index) => ({
    index,
    label: item.date.slice(5),
    weight: Number(convertWeight(item.weightKg).toFixed(1)),
  }));

  if (!chartData.length) {
    return (
      <AharCard>
        <AharText variant="h3" weight="bold">
          Weight trend
        </AharText>
        <AharText variant="caption" color={COLORS.textSecondary}>
          Track how your body weight changes week by week from check-ins.
        </AharText>
        <AharText variant="body" color={COLORS.textSecondary}>
          Add weekly check-ins to view your trend.
        </AharText>
      </AharCard>
    );
  }

  const n = chartData.length;
  const vals = chartData.map((d) => d.weight);
  const rawMin = Math.min(...vals);
  const rawMax = Math.max(...vals);
  const spread = rawMax - rawMin || 1;
  const yMin = rawMin - spread * 0.12;
  const yMax = rawMax + spread * 0.12;

  const xOf = (i: number) =>
    PAD.l + (n > 1 ? (i / (n - 1)) * PW : PW / 2);
  const yOf = (v: number) =>
    PAD.t + PH - ((v - yMin) / (yMax - yMin)) * PH;

  const points = chartData.map((d) => ({ x: xOf(d.index), y: yOf(d.weight) }));

  const yTicks = Array.from({ length: 4 }, (_, i) =>
    yMin + (i / 3) * (yMax - yMin),
  );

  const xTickIdx =
    n <= 5
      ? chartData.map((d) => d.index)
      : [0, Math.floor(n / 4), Math.floor(n / 2), Math.floor((3 * n) / 4), n - 1];

  return (
    <AharCard>
      <View style={styles.header}>
        <AharText variant="h3" weight="bold">
          Weight trend
        </AharText>
        <AharText variant="caption" color={COLORS.textSecondary}>
          {unitLabel}
        </AharText>
      </View>
      <AharText variant="caption" color={COLORS.textSecondary}>
        Lower or stable trend may indicate fat-loss progress; rising trend can
        support muscle-gain goals.
      </AharText>
      <View style={styles.chart}>
        <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
          {yTicks.map((v, i) => (
            <G key={i}>
              <SvgLine
                x1={PAD.l}
                y1={yOf(v)}
                x2={W - PAD.r}
                y2={yOf(v)}
                stroke={COLORS.border}
                strokeWidth={0.6}
                strokeDasharray="3,3"
              />
              <SvgText
                x={PAD.l - 4}
                y={yOf(v) + 3.5}
                fontSize={9}
                fill={COLORS.textMuted}
                textAnchor="end"
              >
                {v.toFixed(1)}
              </SvgText>
            </G>
          ))}

          <Path
            d={linePath(points)}
            stroke={COLORS.secondary}
            strokeWidth={2.2}
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {points.map((p, i) => (
            <Circle key={i} cx={p.x} cy={p.y} r={3} fill={COLORS.primary} />
          ))}

          {xTickIdx.map((i) => (
            <SvgText
              key={i}
              x={xOf(i)}
              y={H - 6}
              fontSize={9}
              fill={COLORS.textMuted}
              textAnchor="middle"
            >
              {chartData[i]?.label ?? ""}
            </SvgText>
          ))}
        </Svg>
      </View>
    </AharCard>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  chart: {
    height: 155,
    marginTop: SPACING.sm,
  },
});

export default WeightChart;
