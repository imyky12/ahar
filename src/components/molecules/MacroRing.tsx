import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";

import type { Macros } from "../../types";
import { COLORS, SPACING } from "../../constants";
import { AharText } from "../atoms";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type MacroRingSize = "sm" | "md" | "lg";

export interface MacroRingProps {
  macros: Macros;
  target: Macros;
  size?: MacroRingSize;
}

const dimensions: Record<MacroRingSize, { size: number; stroke: number }> = {
  sm: { size: 120, stroke: 8 },
  md: { size: 160, stroke: 10 },
  lg: { size: 200, stroke: 12 },
};

export const MacroRing = ({ macros, target, size = "md" }: MacroRingProps) => {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [macros, progress]);

  const dim = dimensions[size];
  const center = dim.size / 2;

  const rings = useMemo(() => {
    return [
      {
        key: "protein",
        radius: center - dim.stroke,
        color: COLORS.primary,
        value: macros.protein,
        targetValue: Math.max(target.protein, 1),
      },
      {
        key: "carbs",
        radius: center - dim.stroke * 2.6,
        color: COLORS.accent,
        value: macros.carbs,
        targetValue: Math.max(target.carbs, 1),
      },
      {
        key: "fat",
        radius: center - dim.stroke * 4.2,
        color: COLORS.warning,
        value: macros.fat,
        targetValue: Math.max(target.fat, 1),
      },
    ];
  }, [
    center,
    dim.stroke,
    macros.carbs,
    macros.fat,
    macros.protein,
    target.carbs,
    target.fat,
    target.protein,
  ]);

  return (
    <View style={styles.wrapper}>
      <View
        style={{
          width: dim.size,
          height: dim.size,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Svg width={dim.size} height={dim.size}>
          <G rotation="-90" origin={`${center}, ${center}`}>
            {rings.map((ring) => {
              const circumference = 2 * Math.PI * ring.radius;
              const ratio = Math.min(ring.value / ring.targetValue, 1);

              const dashOffset = progress.interpolate({
                inputRange: [0, 1],
                outputRange: [circumference, circumference * (1 - ratio)],
              });

              return (
                <G key={ring.key}>
                  <Circle
                    cx={center}
                    cy={center}
                    r={ring.radius}
                    stroke={COLORS.border}
                    strokeWidth={dim.stroke}
                    fill="transparent"
                  />
                  <AnimatedCircle
                    cx={center}
                    cy={center}
                    r={ring.radius}
                    stroke={ring.color}
                    strokeWidth={dim.stroke}
                    fill="transparent"
                    strokeDasharray={`${circumference} ${circumference}`}
                    strokeDashoffset={dashOffset}
                    strokeLinecap="round"
                  />
                </G>
              );
            })}
          </G>
        </Svg>

        <View style={styles.centerText}>
          <AharText variant="h3" weight="bold">
            {macros.calories}/{target.calories}
          </AharText>
          <AharText variant="caption" color={COLORS.textSecondary}>
            kcal
          </AharText>
        </View>
      </View>

      <View style={styles.legendRow}>
        <AharText variant="caption" color={COLORS.primary}>
          P {macros.protein}/{target.protein}g
        </AharText>
        <AharText variant="caption" color={COLORS.accent}>
          C {macros.carbs}/{target.carbs}g
        </AharText>
        <AharText variant="caption" color={COLORS.warning}>
          F {macros.fat}/{target.fat}g
        </AharText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
  },
  centerText: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  legendRow: {
    flexDirection: "row",
    gap: SPACING.md,
  },
});

export default MacroRing;
