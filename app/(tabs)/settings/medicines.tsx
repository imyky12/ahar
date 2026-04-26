import { useCallback, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  AharButton,
  AharCard,
  AharInput,
  AharText,
  AharTimePicker,
  EmptyState,
  useToast,
} from "../../../src/components/atoms";
import { MedicineReminderCard } from "../../../src/components/molecules";
import { COLORS, SPACING } from "../../../src/constants";
import { useMedicineReminders } from "../../../src/hooks";

export const MedicinesScreen = () => {
  const {
    reminders,
    createReminder,
    updateReminder,
    deleteReminder,
    isLoading,
    refetch,
  } = useMedicineReminders();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  }, [refetch]);
  const { showToast } = useToast();

  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [time, setTime] = useState("08:00");
  const [instructions, setInstructions] = useState("");

  const activeCount = useMemo(
    () => reminders.filter((item) => item.active).length,
    [reminders],
  );

  const addReminder = async (): Promise<void> => {
    if (!name.trim() || !dosage.trim()) {
      showToast("Please enter medicine name and dosage", "warning");
      return;
    }

    await createReminder({
      name: name.trim(),
      dosage: dosage.trim(),
      time,
      instructions: instructions.trim() || undefined,
      withFood: false,
      active: true,
    });

    setName("");
    setDosage("");
    setInstructions("");
    showToast("Medicine reminder added", "success");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void onRefresh()}
            tintColor={COLORS.primary}
          />
        }
      >
        <AharText variant="h2" weight="bold">
          Medicine reminders
        </AharText>
        <AharText variant="caption" color={COLORS.textSecondary}>
          {activeCount} active reminders. AHAR will notify at scheduled times.
        </AharText>

        <AharCard style={styles.card}>
          <AharText weight="bold">Add reminder</AharText>
          <AharInput
            label="Medicine"
            placeholder="e.g., Metformin"
            value={name}
            onChangeText={setName}
          />
          <AharInput
            label="Dosage"
            placeholder="e.g., 500mg"
            value={dosage}
            onChangeText={setDosage}
          />
          <AharTimePicker label="Time" value={time} onChange={setTime} />
          <AharInput
            label="Instructions"
            placeholder="Optional note"
            value={instructions}
            onChangeText={setInstructions}
          />
          <AharButton
            label="Add medicine"
            onPress={() => void addReminder()}
            loading={isLoading}
          />
        </AharCard>

        {reminders.map((reminder) => (
          <MedicineReminderCard
            key={reminder._id}
            reminder={reminder}
            onToggleActive={(active) => {
              void updateReminder({
                id: reminder._id,
                payload: { active },
              }).then(() =>
                showToast(
                  active ? "Reminder enabled" : "Reminder paused",
                  "success",
                ),
              );
            }}
            onDelete={() => {
              void deleteReminder(reminder._id).then(() =>
                showToast("Reminder deleted", "success"),
              );
            }}
          />
        ))}

        {!reminders.length ? (
          <EmptyState
            icon="medkit-outline"
            title="No medicine reminders"
            subtitle="Add your first medicine reminder above."
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    padding: SPACING.lg,
    paddingBottom: 120,
    gap: SPACING.md,
  },
  card: {
    gap: SPACING.sm,
  },
});

export default MedicinesScreen;
