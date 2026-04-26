import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, StyleSheet } from "react-native";

import {
  AharButton,
  AharCard,
  AharText,
  AharTimePicker,
  useToast,
} from "../../../src/components/atoms";
import { KeyboardAwareScreen } from "../../../src/components/molecules";
import { COLORS, SPACING } from "../../../src/constants";
import { useProfile } from "../../../src/hooks";
import { rescheduleNotifications } from "../../../src/services/notificationService";

const addMinutes = (time: string, minutes: number): string => {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const normalized = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const hh = Math.floor(normalized / 60)
    .toString()
    .padStart(2, "0");
  const mm = (normalized % 60).toString().padStart(2, "0");
  return `${hh}:${mm}`;
};

export const ScheduleScreen = () => {
  const { profile, updateProfileMutation } = useProfile();
  const { showToast } = useToast();

  const [schedule, setSchedule] = useState(
    profile?.schedule ?? {
      wakeTime: "06:30",
      sleepTime: "23:00",
      officeStart: "09:30",
      officeEnd: "18:30",
      gymStart: "19:30",
      gymEnd: "20:30",
    },
  );

  const preview = useMemo(() => {
    return {
      energy: addMinutes(schedule.wakeTime, 5),
      breakfast: addMinutes(schedule.wakeTime, 30),
      lunch: schedule.officeStart
        ? addMinutes(schedule.officeStart, 240)
        : "13:00",
      preWorkout: schedule.gymStart
        ? addMinutes(schedule.gymStart, -45)
        : "18:30",
      sleep: addMinutes(schedule.sleepTime, -30),
    };
  }, [schedule]);

  const save = async (): Promise<void> => {
    await updateProfileMutation.mutateAsync({ schedule });
    Alert.alert(
      "Reschedule notifications?",
      "Your notification times have changed. Reschedule today's remaining notifications?",
      [
        {
          text: "Keep existing",
          style: "cancel",
          onPress: () => router.back(),
        },
        {
          text: "Yes, reschedule",
          onPress: () => {
            void rescheduleNotifications().then(() => {
              showToast("Notifications rescheduled", "success");
              router.back();
            });
          },
        },
      ],
    );
  };

  return (
    <KeyboardAwareScreen contentContainerStyle={styles.container}>
      <AharText variant="caption" color={COLORS.textSecondary}>
        Set your daily routine so meal reminders, prep prompts, and check-ins
        are sent at useful times.
      </AharText>

      <AharCard style={styles.card}>
        <AharText variant="h3" weight="bold">
          Daily timings
        </AharText>
        <AharText variant="caption" color={COLORS.textSecondary}>
          Update your wake/sleep, office, and workout windows. AHAR uses this
          schedule for time-aware notifications.
        </AharText>
        <AharTimePicker
          label="Wake up time"
          value={schedule.wakeTime}
          onChange={(wakeTime) =>
            setSchedule((prev) => ({ ...prev, wakeTime }))
          }
        />
        <AharTimePicker
          label="Sleep time"
          value={schedule.sleepTime}
          onChange={(sleepTime) =>
            setSchedule((prev) => ({ ...prev, sleepTime }))
          }
        />
        <AharTimePicker
          label="Office start"
          value={schedule.officeStart}
          onChange={(officeStart) =>
            setSchedule((prev) => ({ ...prev, officeStart }))
          }
        />
        <AharTimePicker
          label="Office end"
          value={schedule.officeEnd}
          onChange={(officeEnd) =>
            setSchedule((prev) => ({ ...prev, officeEnd }))
          }
        />
        <AharTimePicker
          label="Gym/workout start"
          value={schedule.gymStart}
          onChange={(gymStart) =>
            setSchedule((prev) => ({ ...prev, gymStart }))
          }
        />
        <AharTimePicker
          label="Gym/workout end"
          value={schedule.gymEnd}
          onChange={(gymEnd) => setSchedule((prev) => ({ ...prev, gymEnd }))}
        />
      </AharCard>

      <AharCard style={styles.card}>
        <AharText variant="h3" weight="bold">
          Notification preview
        </AharText>
        <AharText variant="caption" color={COLORS.textSecondary}>
          Preview of likely reminder times based on your inputs.
        </AharText>
        <AharText variant="caption" color={COLORS.textSecondary}>
          Energy check-in: {preview.energy}
        </AharText>
        <AharText variant="caption" color={COLORS.textSecondary}>
          Breakfast check-in: {preview.breakfast}
        </AharText>
        <AharText variant="caption" color={COLORS.textSecondary}>
          Lunch check-in: {preview.lunch}
        </AharText>
        <AharText variant="caption" color={COLORS.textSecondary}>
          Pre-workout: {preview.preWorkout}
        </AharText>
        <AharText variant="caption" color={COLORS.textSecondary}>
          Sleep check-in: {preview.sleep}
        </AharText>
        <AharText variant="caption" color={COLORS.textMuted}>
          Actual times depend on your meal plan
        </AharText>
      </AharCard>

      <AharButton
        label="Save"
        fullWidth
        onPress={() => void save()}
        loading={updateProfileMutation.isPending}
      />
    </KeyboardAwareScreen>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: SPACING.xxl,
    gap: SPACING.lg,
    paddingBottom: 120,
  },
  card: {
    gap: SPACING.md,
  },
});

export default ScheduleScreen;
