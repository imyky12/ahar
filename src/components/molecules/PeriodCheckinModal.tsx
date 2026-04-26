import { useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, View } from "react-native";

import { BORDER_RADIUS, COLORS, SPACING } from "../../constants";
import { useUiStore } from "../../stores";
import { useProfile } from "../../hooks";
import { AharButton, AharCard, AharDatePicker, AharInput, AharText, useToast } from "../atoms";

const today = (): string => new Date().toISOString().slice(0, 10);

const formatDate = (iso: string): string => {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "long", year: "numeric" });
};

// Step 1: user taps "Period started today" or picks a date
// Step 2: confirmation screen showing exactly what will be saved
// Dismiss = no change
export const PeriodCheckinModal = () => {
  const visible = useUiStore((state) => state.showPeriodCheckinModal);
  const setVisible = useUiStore((state) => state.setShowPeriodCheckinModal);
  const { profile, updateProfileMutation } = useProfile();
  const { showToast } = useToast();

  const [step, setStep] = useState<"pick" | "confirm">("pick");
  const [selectedDate, setSelectedDate] = useState<string>(today());
  const [cycleLength, setCycleLength] = useState<string>(
    String(profile?.female?.cycleLength ?? 28),
  );
  const [cycleLengthError, setCycleLengthError] = useState<string | null>(null);

  const handleOpen = () => {
    setStep("pick");
    setSelectedDate(today());
    setCycleLength(String(profile?.female?.cycleLength ?? 28));
    setCycleLengthError(null);
  };

  const handleTodayShortcut = () => {
    setSelectedDate(today());
    validateAndAdvance(today(), cycleLength);
  };

  const validateAndAdvance = (date: string, cl: string) => {
    const parsed = parseInt(cl, 10);
    if (isNaN(parsed) || parsed < 21 || parsed > 35) {
      setCycleLengthError("Cycle length must be between 21 and 35 days.");
      return;
    }
    setCycleLengthError(null);
    setSelectedDate(date);
    setCycleLength(String(parsed));
    setStep("confirm");
  };

  const handleSave = async (): Promise<void> => {
    const parsed = parseInt(cycleLength, 10);
    try {
      await updateProfileMutation.mutateAsync({
        female: {
          trackCycle: true,
          lastPeriodDate: new Date(`${selectedDate}T00:00:00`),
          cycleLength: parsed,
        },
      });
      showToast("Period date updated. Plan will refresh tonight. 🌸", "success");
      setVisible(false);
    } catch {
      showToast("Could not update period date. Try again.", "error");
    }
  };

  const handleClose = () => {
    if (updateProfileMutation.isPending) return;
    Alert.alert(
      "Discard changes?",
      "Your period date won't be updated.",
      [
        { text: "Keep editing", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: () => setVisible(false),
        },
      ],
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
      onShow={handleOpen}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropPressable} onPress={handleClose} />

        <AharCard elevated style={styles.card}>
          {step === "pick" ? (
            <>
              <View style={styles.titleRow}>
                <AharText variant="h3" weight="bold">
                  Log your period 🌸
                </AharText>
                <Pressable onPress={handleClose} hitSlop={8}>
                  <AharText variant="caption" color={COLORS.textMuted}>✕</AharText>
                </Pressable>
              </View>

              <AharText variant="caption" color={COLORS.textSecondary}>
                Updating this helps AHAR adjust your meal plan for each phase of
                your cycle — iron during menstrual, light meals for ovulation, and
                extra carbs for the luteal phase.
              </AharText>

              {/* Quick shortcut */}
              <Pressable
                style={styles.todayButton}
                onPress={handleTodayShortcut}
              >
                <AharText weight="medium" color={COLORS.secondary}>
                  My period started today ({formatDate(today())})
                </AharText>
              </Pressable>

              <AharText
                variant="caption"
                color={COLORS.textMuted}
                style={styles.orLabel}
              >
                — or pick a different date —
              </AharText>

              <AharDatePicker
                label="First day of last period"
                value={selectedDate}
                onChange={setSelectedDate}
              />

              <AharInput
                label="Cycle length (days)"
                placeholder="28"
                keyboardType="number-pad"
                value={cycleLength}
                onChangeText={(v) => {
                  setCycleLength(v);
                  setCycleLengthError(null);
                }}
              />
              {cycleLengthError ? (
                <AharText variant="caption" color={COLORS.error}>
                  {cycleLengthError}
                </AharText>
              ) : null}

              <AharText variant="caption" color={COLORS.textMuted}>
                Typical cycle length is 21–35 days. Most people are 28 days.
              </AharText>

              <View style={styles.actions}>
                <AharButton
                  label="Cancel"
                  variant="secondary"
                  onPress={handleClose}
                  style={styles.flex}
                />
                <AharButton
                  label="Review →"
                  style={styles.flex}
                  onPress={() => validateAndAdvance(selectedDate, cycleLength)}
                />
              </View>
            </>
          ) : (
            <>
              <View style={styles.titleRow}>
                <AharText variant="h3" weight="bold">
                  Confirm update
                </AharText>
                <Pressable onPress={() => setStep("pick")} hitSlop={8}>
                  <AharText variant="caption" color={COLORS.textMuted}>← Back</AharText>
                </Pressable>
              </View>

              <AharText variant="caption" color={COLORS.textSecondary}>
                Please review before saving. This will update your cycle data and
                AHAR will recalculate your menstrual phase for tonight's plan.
              </AharText>

              <View style={styles.confirmRow}>
                <AharText variant="caption" color={COLORS.textSecondary}>
                  Period start date
                </AharText>
                <AharText weight="medium">{formatDate(selectedDate)}</AharText>
              </View>

              <View style={styles.confirmRow}>
                <AharText variant="caption" color={COLORS.textSecondary}>
                  Cycle length
                </AharText>
                <AharText weight="medium">{cycleLength} days</AharText>
              </View>

              <View style={styles.confirmRow}>
                <AharText variant="caption" color={COLORS.textSecondary}>
                  Estimated current phase
                </AharText>
                <AharText weight="medium" color={COLORS.secondary}>
                  {estimatePhaseLabel(selectedDate, parseInt(cycleLength, 10))}
                </AharText>
              </View>

              <AharText variant="caption" color={COLORS.textMuted}>
                Your plan will be regenerated tonight with phase-specific meals.
                You can update this anytime from Profile → Cycle tracking.
              </AharText>

              <View style={styles.actions}>
                <AharButton
                  label="← Edit"
                  variant="secondary"
                  onPress={() => setStep("pick")}
                  style={styles.flex}
                />
                <AharButton
                  label="Save"
                  style={styles.flex}
                  onPress={() => void handleSave()}
                  loading={updateProfileMutation.isPending}
                />
              </View>
            </>
          )}
        </AharCard>
      </View>
    </Modal>
  );
};

const estimatePhaseLabel = (isoDate: string, cycleLength: number): string => {
  const start = new Date(`${isoDate}T00:00:00`);
  const daysSince = Math.max(
    1,
    Math.floor((Date.now() - start.getTime()) / 86_400_000) + 1,
  );
  const cycleDay = ((daysSince - 1) % cycleLength) + 1;

  if (cycleDay <= 5) return `Menstrual (day ${cycleDay})`;
  if (cycleDay <= 13) return `Follicular (day ${cycleDay})`;
  if (cycleDay <= 16) return `Ovulation (day ${cycleDay})`;
  return `Luteal (day ${cycleDay})`;
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: COLORS.overlay50,
    justifyContent: "flex-end",
  },
  backdropPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderTopLeftRadius: BORDER_RADIUS.card * 2,
    borderTopRightRadius: BORDER_RADIUS.card * 2,
    padding: SPACING.xxl,
    gap: SPACING.md,
    paddingBottom: SPACING.huge,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  todayButton: {
    borderWidth: 1,
    borderColor: COLORS.secondary,
    borderRadius: BORDER_RADIUS.input,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    alignItems: "center",
    backgroundColor: `${COLORS.secondary}18`,
  },
  orLabel: {
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  flex: {
    flex: 1,
  },
  confirmRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
});

export default PeriodCheckinModal;
