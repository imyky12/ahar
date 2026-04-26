import { useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";

import { API_ROUTES, BORDER_RADIUS, COLORS, SPACING } from "../../constants";
import { useUiStore } from "../../stores";
import { authClient } from "../../services/authService";
import { AharCard, AharText, useToast } from "../atoms";

const options = [
  { emoji: "😴", label: "Very low", level: 1 },
  { emoji: "😕", label: "Low", level: 2 },
  { emoji: "😐", label: "Okay", level: 3 },
  { emoji: "😊", label: "Good", level: 4 },
  { emoji: "⚡", label: "Excellent", level: 5 },
] as const;

const conditionOptions = [
  { emoji: "🤧", label: "Cold/Flu" },
  { emoji: "🤢", label: "Nausea" },
  { emoji: "🤕", label: "Headache" },
  { emoji: "😩", label: "Fatigue" },
  { emoji: "🩹", label: "Injury" },
  { emoji: "✈️", label: "Travelling" },
  { emoji: "😔", label: "Stress" },
  { emoji: "❓", label: "Other" },
];

export const EnergyCheckinModal = () => {
  const visible = useUiStore((state) => state.showEnergyCheckinModal);
  const setVisible = useUiStore((state) => state.setShowEnergyCheckinModal);
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [pendingLevel, setPendingLevel] = useState<number | null>(null);

  const submitFinal = async (level: number, temporaryCondition?: string): Promise<void> => {
    setSaving(true);
    try {
      await authClient.post(API_ROUTES.logs.energy, {
        date: new Date().toISOString().slice(0, 10),
        level,
        temporaryCondition,
      });
      showToast("Energy logged! ⚡", "success");
    } catch {
      showToast("Could not log energy", "warning");
    } finally {
      setSaving(false);
      setPendingLevel(null);
      setVisible(false);
    }
  };

  const handleEnergySelect = (level: number): void => {
    if (level <= 2) {
      setPendingLevel(level);
    } else {
      void submitFinal(level);
    }
  };

  const handleConditionSelect = (condition: string): void => {
    if (pendingLevel !== null) {
      void submitFinal(pendingLevel, condition);
    }
  };

  const handleSkipCondition = (): void => {
    if (pendingLevel !== null) {
      void submitFinal(pendingLevel);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => setVisible(false)}
    >
      <View style={styles.backdrop}>
        <Pressable
          style={styles.backdropPressable}
          onPress={() => setVisible(false)}
        />
        <AharCard elevated style={styles.modalCard}>
          {pendingLevel === null ? (
            <>
              <AharText variant="h3" weight="bold">
                How's your energy today?
              </AharText>
              <View style={styles.row}>
                {options.map((option) => (
                  <Pressable
                    key={option.level}
                    disabled={saving}
                    style={styles.option}
                    onPress={() => handleEnergySelect(option.level)}
                  >
                    <AharText variant="h2">{option.emoji}</AharText>
                    <AharText variant="caption" color={COLORS.textSecondary}>
                      {option.label}
                    </AharText>
                  </Pressable>
                ))}
              </View>
            </>
          ) : (
            <>
              <AharText variant="h3" weight="bold">
                What's bringing you down?
              </AharText>
              <AharText variant="caption" color={COLORS.textSecondary}>
                Your plan will be adjusted accordingly.
              </AharText>
              <View style={styles.conditionGrid}>
                {conditionOptions.map((c) => (
                  <Pressable
                    key={c.label}
                    disabled={saving}
                    style={styles.conditionOption}
                    onPress={() => handleConditionSelect(c.label)}
                  >
                    <AharText variant="h2">{c.emoji}</AharText>
                    <AharText variant="caption" color={COLORS.textSecondary}>
                      {c.label}
                    </AharText>
                  </Pressable>
                ))}
              </View>
              <Pressable onPress={handleSkipCondition} disabled={saving}>
                <AharText variant="caption" color={COLORS.textMuted} style={styles.skip}>
                  Skip
                </AharText>
              </Pressable>
            </>
          )}
        </AharCard>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: COLORS.overlay50,
    justifyContent: "center",
    padding: SPACING.xl,
  },
  backdropPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    gap: SPACING.lg,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },
  option: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.input,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface2,
  },
  conditionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  conditionOption: {
    width: "22%",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.input,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface2,
  },
  skip: {
    textAlign: "center",
    textDecorationLine: "underline",
  },
});

export default EnergyCheckinModal;
