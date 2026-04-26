import { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { BORDER_RADIUS, COLORS, SPACING } from "../../constants";
import {
  AharButton,
  AharCard,
  AharChip,
  AharInput,
  AharText,
  useToast,
} from "../atoms";

export interface WaterTrackerProps {
  consumed: number;
  goal: number;
  onAdd: (amount: number) => void;
}

const quickAmounts = [150, 200, 300, 500];

export const WaterTracker = ({ consumed, goal, onAdd }: WaterTrackerProps) => {
  const { showToast } = useToast();
  const [showCustom, setShowCustom] = useState(false);
  const [customValue, setCustomValue] = useState("250");

  const progress = goal > 0 ? Math.min(1, consumed / goal) : 0;
  const reachedGoal = consumed >= goal && goal > 0;

  const size = 180;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  const ringColor = reachedGoal ? COLORS.success : COLORS.primary;

  const onQuickAdd = (amount: number): void => {
    onAdd(amount);
    if (consumed + amount >= goal && !reachedGoal) {
      showToast("Hydration goal hit! 💧", "success");
    }
  };

  const onCustomSave = (): void => {
    const parsed = Number(customValue);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return;
    }

    onQuickAdd(Math.round(parsed));
    setShowCustom(false);
  };

  return (
    <AharCard elevated style={styles.card}>
      <View style={styles.ringWrap}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={COLORS.border}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={ringColor}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>

        <View style={styles.centerText}>
          {reachedGoal ? (
            <AharText variant="h3" weight="bold" color={COLORS.success}>
              🎉 Goal reached!
            </AharText>
          ) : (
            <AharText variant="h2" weight="bold">
              {Math.round(consumed)} ml
            </AharText>
          )}
          <AharText variant="caption" color={COLORS.textSecondary}>
            Goal: {Math.round(goal)} ml
          </AharText>
        </View>
      </View>

      <View style={styles.quickRow}>
        {quickAmounts.map((amount) => (
          <AharChip
            key={amount}
            label={`${amount}ml`}
            onPress={() => onQuickAdd(amount)}
          />
        ))}
      </View>

      <Pressable onPress={() => setShowCustom(true)}>
        <AharText variant="caption" color={COLORS.secondary}>
          Custom
        </AharText>
      </Pressable>

      <Modal
        visible={showCustom}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCustom(false)}
      >
        <View style={styles.backdrop}>
          <AharCard elevated style={styles.modalCard}>
            <AharText variant="h3" weight="bold">
              Custom water amount
            </AharText>
            <AharInput
              label="Amount (ml)"
              placeholder="Enter ml"
              keyboardType="numeric"
              value={customValue}
              onChangeText={setCustomValue}
            />
            <View style={styles.modalActions}>
              <AharButton
                label="Cancel"
                variant="ghost"
                onPress={() => setShowCustom(false)}
              />
              <AharButton label="Add" onPress={onCustomSave} />
            </View>
          </AharCard>
        </View>
      </Modal>
    </AharCard>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: SPACING.md,
    alignItems: "center",
  },
  ringWrap: {
    width: 180,
    height: 180,
    alignItems: "center",
    justifyContent: "center",
  },
  centerText: {
    position: "absolute",
    alignItems: "center",
    gap: SPACING.xs,
  },
  quickRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: SPACING.sm,
  },
  backdrop: {
    flex: 1,
    backgroundColor: COLORS.overlay60,
    justifyContent: "center",
    padding: SPACING.xl,
  },
  modalCard: {
    gap: SPACING.md,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: SPACING.sm,
  },
});

export default WaterTracker;
