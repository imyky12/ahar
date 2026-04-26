import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Switch, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import {
  AharButton,
  AharCard,
  AharSlider,
  AharText,
  AharTimePicker,
  useToast,
} from "../../../src/components/atoms";
import { COLORS, SPACING } from "../../../src/constants";
import { useNotifications } from "../../../src/hooks";
import type { UserNotificationSettings } from "../../../src/types";

export const NotificationSettingsScreen = () => {
  const { settings, updateSettings, isLoading } = useNotifications();
  const { showToast } = useToast();

  const [draft, setDraft] = useState<UserNotificationSettings>(settings);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  const disabled = !draft.notificationsEnabled;

  const setType = (
    key: keyof UserNotificationSettings["enabledTypes"],
    value: boolean,
  ) => {
    setDraft((current) => ({
      ...current,
      enabledTypes: {
        ...current.enabledTypes,
        [key]: value,
      },
    }));
  };

  const groupedTypes = useMemo(
    () => [
      { label: "Meal check-ins", key: "meal_checkin" as const },
      { label: "Water reminders", key: "water_reminder" as const },
      { label: "Walk reminders", key: "walk_reminder" as const },
      { label: "Skin & body care tips", key: "skin_care" as const },
      { label: "Gym & workout alerts", key: "gym_log" as const },
      { label: "Prep task reminders", key: "prep_task" as const },
      { label: "Macro alerts", key: "macro_alert" as const },
      { label: "Weekly check-in", key: "weekly_checkin" as const },
      { label: "Streak milestones", key: "streak_milestone" as const },
    ],
    [],
  );

  const save = async (): Promise<void> => {
    await updateSettings({
      notificationsEnabled: draft.notificationsEnabled,
      quietHoursStart: draft.quietHoursStart,
      quietHoursEnd: draft.quietHoursEnd,
      enabledTypes: draft.enabledTypes,
      waterReminderIntervalMinutes: draft.waterReminderIntervalMinutes,
    });

    showToast("Notification settings saved", "success");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <AharText variant="caption" color={COLORS.textSecondary}>
          Control what reminders you get and when they are allowed. Changes here
          apply to all AHAR notifications.
        </AharText>

        <AharCard elevated style={styles.card}>
          <AharText variant="caption" color={COLORS.textSecondary}>
            Master switch to turn all notifications on or off.
          </AharText>
          <View style={styles.rowBetween}>
            <AharText weight="medium">Enable all notifications</AharText>
            <Switch
              value={draft.notificationsEnabled}
              onValueChange={(value) => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setDraft((current) => ({
                  ...current,
                  notificationsEnabled: value,
                }));
              }}
            />
          </View>
        </AharCard>

        <AharCard
          elevated
          style={[styles.card, disabled ? styles.disabled : null]}
        >
          <AharText weight="bold">Quiet hours</AharText>
          <AharText variant="caption" color={COLORS.textSecondary}>
            No notifications during these hours
          </AharText>
          <View style={styles.row}>
            <View style={styles.flexOne}>
              <AharTimePicker
                label="From"
                value={draft.quietHoursStart}
                onChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    quietHoursStart: value,
                  }))
                }
              />
            </View>
            <View style={styles.flexOne}>
              <AharTimePicker
                label="Until"
                value={draft.quietHoursEnd}
                onChange={(value) =>
                  setDraft((current) => ({ ...current, quietHoursEnd: value }))
                }
              />
            </View>
          </View>
        </AharCard>

        <AharCard
          elevated
          style={[styles.card, disabled ? styles.disabled : null]}
        >
          <AharText weight="bold">Water reminders</AharText>
          <AharText variant="caption" color={COLORS.textSecondary}>
            Choose reminder frequency for hydration nudges.
          </AharText>
          <AharSlider
            label={`Remind me every ${draft.waterReminderIntervalMinutes} minutes`}
            value={draft.waterReminderIntervalMinutes}
            minimumValue={30}
            maximumValue={180}
            step={15}
            suffix=" min"
            onValueChange={(value) =>
              setDraft((current) => ({
                ...current,
                waterReminderIntervalMinutes: value,
              }))
            }
          />
        </AharCard>

        <AharCard
          elevated
          style={[styles.card, disabled ? styles.disabled : null]}
        >
          <AharText weight="bold">Notification types</AharText>
          <AharText variant="caption" color={COLORS.textSecondary}>
            Enable only the categories you want to receive.
          </AharText>
          {groupedTypes.map((item) => (
            <View key={item.key} style={styles.rowBetween}>
              <AharText>{item.label}</AharText>
              <Switch
                value={draft.enabledTypes[item.key]}
                onValueChange={(value) => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setType(item.key, value);
                }}
                disabled={disabled}
              />
            </View>
          ))}
        </AharCard>
      </ScrollView>

      <View style={styles.footer}>
        <AharButton
          label="Save"
          fullWidth
          onPress={() => void save()}
          loading={isLoading}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    padding: SPACING.xxl,
    gap: SPACING.lg,
    paddingBottom: 100,
  },
  card: {
    gap: SPACING.md,
  },
  row: {
    flexDirection: "row",
    gap: SPACING.md,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: SPACING.sm,
  },
  flexOne: {
    flex: 1,
  },
  disabled: {
    opacity: 0.5,
  },
  footer: {
    position: "absolute",
    left: SPACING.xxl,
    right: SPACING.xxl,
    bottom: SPACING.xxl,
  },
});

export default NotificationSettingsScreen;
