import { useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";

import { API_ROUTES, COLORS, SPACING } from "../../constants";
import { useUiStore } from "../../stores";
import { authClient } from "../../services/authService";
import {
  AharButton,
  AharCard,
  AharInput,
  AharSlider,
  AharText,
  useToast,
} from "../atoms";

export const SleepCheckinModal = () => {
  const visible = useUiStore((state) => state.showSleepCheckinModal);
  const setVisible = useUiStore((state) => state.setShowSleepCheckinModal);
  const { showToast } = useToast();

  const [quality, setQuality] = useState(7);
  const [hoursSlept, setHoursSlept] = useState("7");
  const [isSaving, setIsSaving] = useState(false);

  const onSubmit = async (): Promise<void> => {
    setIsSaving(true);
    try {
      await authClient.post(API_ROUTES.logs.sleep, {
        date: new Date().toISOString().slice(0, 10),
        quality,
        hoursSlept: Number(hoursSlept),
      });
      showToast("Sleep logged! 😴", "success");
      setVisible(false);
    } catch {
      showToast("Could not log sleep", "warning");
    } finally {
      setIsSaving(false);
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
          <AharText variant="h3" weight="bold">
            How did you sleep?
          </AharText>
          <AharSlider
            label="Sleep quality"
            value={quality}
            minimumValue={1}
            maximumValue={10}
            step={1}
            onValueChange={setQuality}
          />
          <AharText variant="caption" color={COLORS.textSecondary}>
            😫 Terrible ... 😴 Amazing
          </AharText>
          <AharInput
            label="Hours slept"
            placeholder="e.g. 7.5"
            value={hoursSlept}
            onChangeText={setHoursSlept}
            keyboardType="numeric"
          />
          <AharButton
            label="Submit"
            onPress={() => void onSubmit()}
            loading={isSaving}
          />
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
    gap: SPACING.md,
  },
});

export default SleepCheckinModal;
