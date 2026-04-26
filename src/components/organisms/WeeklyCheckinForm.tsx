import { useMemo, useState } from "react";
import { Modal, StyleSheet, View } from "react-native";

import { BORDER_RADIUS, COLORS, SPACING } from "../../constants";
import { AharButton, AharCard, AharInput, AharText } from "../atoms";

export interface WeeklyCheckinFormProps {
  visible: boolean;
  initialWeight: number;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (weight: number) => Promise<void>;
}

export const WeeklyCheckinForm = ({
  visible,
  initialWeight,
  isSubmitting,
  onClose,
  onSubmit,
}: WeeklyCheckinFormProps) => {
  const [weight, setWeight] = useState(String(initialWeight || ""));

  const parsedWeight = useMemo(() => Number(weight), [weight]);
  const canSubmit = Number.isFinite(parsedWeight) && parsedWeight > 20;

  const handleSubmit = async (): Promise<void> => {
    if (!canSubmit) {
      return;
    }

    await onSubmit(parsedWeight);
  };

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <AharCard style={styles.modalCard}>
          <AharText variant="h3" weight="bold">
            Weekly check-in
          </AharText>
          <AharText variant="body" color={COLORS.textSecondary}>
            Update your current weight to generate this week's AI summary.
          </AharText>

          <AharInput
            label="Weight (kg)"
            value={weight}
            keyboardType="numeric"
            onChangeText={setWeight}
            placeholder="e.g. 72.4"
          />

          <View style={styles.actions}>
            <AharButton label="Cancel" variant="secondary" onPress={onClose} />
            <AharButton
              label={isSubmitting ? "Submitting..." : "Generate"}
              onPress={handleSubmit}
              disabled={!canSubmit || isSubmitting}
            />
          </View>
        </AharCard>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: COLORS.overlay45,
    justifyContent: "flex-end",
    padding: SPACING.lg,
  },
  modalCard: {
    borderRadius: BORDER_RADIUS.card,
    gap: SPACING.md,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: SPACING.sm,
  },
});

export default WeeklyCheckinForm;
