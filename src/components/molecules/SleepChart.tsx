import { View, StyleSheet } from "react-native";
import Svg, { G, Line as SvgLine, Path, Text as SvgText } from "react-native-svg";

import { COLORS, SPACING } from "../../constants";
import type { WeeklyCheckin } from "../../types";
import { AharCard, AharText } from "../atoms";

export interface SleepChartProps {
  data: WeeklyCheckin[];
}

const W = 300;
const H = 145;
const PAD = { t: 10, r: 10, b: 28, l: 30 };
const PW = W - PAD.l - PAD.r;
const PH = H - PAD.t - PAD.b;

const linePath = (pts: { x: number; y: number }[]): string =>
  pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");

export const SleepChart = ({ data }: SleepChartProps) => {
  const chartData = data.map((item, index) => ({
    index,
    label: item.weekStart.slice(5),
    hours: Number(item.avgSleepHours.toFixed(1)),
  }));

  if (!chartData.length) {
    return (
      <AharCard>
        <AharText variant="h3" weight="bold">
          Recovery trend
        </AharText>
        <AharText variant="caption" color={COLORS.textSecondary}>
          Shows your average sleep-hours trend from weekly reports.
        </AharText>
        <AharText variant="body" color={COLORS.textSecondary}>
          Sleep and recovery trend appears after your first report.
        </AharText>
      </AharCard>
    );
  }

  const n = chartData.length;
  const vals = chartData.map((d) => d.hours);
  const yMax = Math.max(10, ...vals);
  const yMin = 0;

  const xOf = (i: number) =>
    PAD.l + (n > 1 ? (i / (n - 1)) * PW : PW / 2);
  const yOf = (v: number) =>
    PAD.t + PH - ((v - yMin) / (yMax - yMin)) * PH;

  const points = chartData.map((d) => ({ x: xOf(d.index), y: yOf(d.hours) }));

  const yTicks = [0, 2, 4, 6, 8, 10].filter((v) => v <= yMax);

  const xTickIdx =
    n <= 5
      ? chartData.map((d) => d.index)
      : [0, Math.floor(n / 4), Math.floor(n / 2), Math.floor((3 * n) / 4), n - 1];

  return (
    <AharCard>
      <AharText variant="h3" weight="bold">
        Recovery trend
      </AharText>
      <AharText variant="caption" color={COLORS.textSecondary}>
        Aim for a stable line closer to 7–8 hours for better recovery and energy.
      </AharText>
      <View style={styles.chart}>
        <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
          {/* 8h reference line */}
          <SvgLine
            x1={PAD.l}
            y1={yOf(8)}
            x2={W - PAD.r}
            y2={yOf(8)}
            stroke={COLORS.secondary}
            strokeWidth={0.8}
            strokeDasharray="4,3"
            opacity={0.4}
          />

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
                {`${v}h`}
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
  chart: {
    height: 145,
    marginTop: SPACING.sm,
  },
});

export default SleepChart;
