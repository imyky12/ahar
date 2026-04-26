import { useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";

import { API_ROUTES, COLORS, SPACING } from "../../constants";
import { useUiStore } from "../../stores";
import { authClient } from "../../services/authService";
import {
  AharButton,
  AharCard,
  AharChip,
  AharInput,
  AharText,
  useToast,
} from "../atoms";

const activityOptions = [
  { label: "Gym", value: "gym" },
  { label: "Home workout", value: "home" },
  { label: "Running", value: "run" },
  { label: "Walking", value: "walk" },
  { label: "Yoga", value: "yoga" },
  { label: "Rest day", value: "rest" },
] as const;

const muscleOptions = [
  "Chest",
  "Back",
  "Shoulders",
  "Arms (Biceps/Triceps)",
  "Legs",
  "Core",
  "Full body",
  "Cardio only",
] as const;

export const GymLogModal = () => {
  const visible = useUiStore((state) => state.showGymLogModal);
  const setVisible = useUiStore((state) => state.setShowGymLogModal);
  const { showToast } = useToast();

  const [activityType, setActivityType] = useState<
    "gym" | "home" | "run" | "walk" | "yoga" | "rest"
  >("gym");
  const [musclesHit, setMusclesHit] = useState<string[]>([]);
  const [durationMinutes, setDurationMinutes] = useState("45");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const toggleMuscle = (muscle: string): void => {
    setMusclesHit((current) =>
      current.includes(muscle)
        ? current.filter((item) => item !== muscle)
        : [...current, muscle],
    );
  };

  const submit = async (): Promise<void> => {
    setSaving(true);
    try {
      await authClient.post(API_ROUTES.logs.gym, {
        date: new Date().toISOString().slice(0, 10),
        musclesHit: activityType === "rest" ? [] : musclesHit,
        activityType,
        durationMinutes: Number(durationMinutes),
        notes,
      });

      const muscleLabel = musclesHit.length
        ? musclesHit.join(", ")
        : activityType;
      showToast("Workout logged! 💪", "success");
      showToast(
        `Tomorrow's diet will be adjusted for your ${muscleLabel} workout.`,
        "info",
      );
      setVisible(false);
    } catch {
      showToast("Could not log workout", "warning");
    } finally {
      setSaving(false);
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
            What did you work on today?
          </AharText>
          <AharText variant="caption" color={COLORS.textSecondary}>
            We'll use this to plan tomorrow's recovery diet
          </AharText>

          <View style={styles.chipWrap}>
            {activityOptions.map((option) => (
              <AharChip
                key={option.value}
                label={option.label}
                selected={activityType === option.value}
                onPress={() => setActivityType(option.value)}
              />
            ))}
          </View>

          {activityType !== "rest" ? (
            <View style={styles.chipWrap}>
              {muscleOptions.map((muscle) => (
                <AharChip
                  key={muscle}
                  label={muscle}
                  selected={musclesHit.includes(muscle)}
                  onPress={() => toggleMuscle(muscle)}
                />
              ))}
            </View>
          ) : null}

          <AharInput
            label="Duration"
            placeholder="Minutes"
            keyboardType="numeric"
            value={durationMinutes}
            onChangeText={setDurationMinutes}
          />

          <AharInput
            label="Notes"
            placeholder="Optional notes"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />

          <AharButton
            label="Save workout"
            loading={saving}
            onPress={() => void submit()}
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
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
});

export default GymLogModal;
