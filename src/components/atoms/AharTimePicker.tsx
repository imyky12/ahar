import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type TextInputProps,
} from "react-native";

import { BORDER_RADIUS, COLORS, SPACING } from "../../constants";
import { AharButton } from "./AharButton";
import { AharText } from "./AharText";

type IoniconName = TextInputProps["inputMode"] extends never
  ? never
  : keyof typeof Ionicons.glyphMap;

export interface AharTimePickerProps {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  icon?: IoniconName;
}

const HHMM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

const parseTimeToDate = (value?: string): Date => {
  const now = new Date();
  if (!value || !HHMM_RE.test(value)) {
    if (value) {
      console.warn(`AharTimePicker: invalid time value "${value}", using default 06:00`);
    }
    now.setHours(6, 0, 0, 0);
    return now;
  }

  const [hourRaw, minuteRaw] = value.split(":");
  now.setHours(Number(hourRaw), Number(minuteRaw), 0, 0);
  return now;
};

const to24hValue = (date: Date): string => {
  const hour = `${date.getHours()}`.padStart(2, "0");
  const minute = `${date.getMinutes()}`.padStart(2, "0");
  return `${hour}:${minute}`;
};

const formatDisplay = (value?: string): string => {
  if (!value) {
    return "Select time";
  }

  const [hourRaw, minuteRaw] = value.split(":");
  const hour = Number(hourRaw);
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;

  return `${displayHour.toString().padStart(2, "0")}:${minuteRaw} ${suffix}`;
};

export const AharTimePicker = ({
  label,
  value,
  onChange,
  icon = "time-outline",
}: AharTimePickerProps) => {
  const [open, setOpen] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(parseTimeToDate(value));

  const selectedPreview = useMemo(
    () => formatDisplay(to24hValue(tempDate)),
    [tempDate],
  );

  const openPicker = (): void => {
    setTempDate(parseTimeToDate(value));
    setOpen(true);
  };

  const handleTimeChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ): void => {
    if (Platform.OS === "android") {
      if (event.type === "dismissed") {
        setOpen(false);
        return;
      }

      if (selectedDate) {
        onChange(to24hValue(selectedDate));
      }
      setOpen(false);
      return;
    }

    if (selectedDate) {
      setTempDate(selectedDate);
    }
  };

  return (
    <>
      <View style={styles.wrapper}>
        <AharText variant="label" color={COLORS.textSecondary}>
          {label}
        </AharText>

        <Pressable style={styles.trigger} onPress={openPicker}>
          <View style={styles.leftContent}>
            <Ionicons name={icon} size={18} color={COLORS.textSecondary} />
            <AharText>{formatDisplay(value)}</AharText>
          </View>
          <Ionicons
            name="chevron-down-outline"
            size={18}
            color={COLORS.textMuted}
          />
        </Pressable>
      </View>

      {Platform.OS === "android" && open ? (
        <DateTimePicker
          mode="time"
          value={tempDate}
          is24Hour
          display="default"
          onChange={handleTimeChange}
        />
      ) : null}

      {Platform.OS === "ios" ? (
        <Modal
          animationType="fade"
          transparent
          visible={open}
          onRequestClose={() => setOpen(false)}
        >
          <View style={styles.backdrop}>
            <Pressable
              style={styles.backdropPressable}
              onPress={() => setOpen(false)}
            />
            <View style={styles.modalCard}>
              <View style={styles.dragHandle} />
              <AharText variant="h3" weight="bold">
                Pick time
              </AharText>
              <AharText variant="caption" color={COLORS.textSecondary}>
                Selected: {selectedPreview}
              </AharText>

              <DateTimePicker
                mode="time"
                value={tempDate}
                is24Hour
                display="spinner"
                onChange={handleTimeChange}
                themeVariant="dark"
              />

              <View style={styles.actions}>
                <AharButton
                  label="Cancel"
                  variant="ghost"
                  onPress={() => setOpen(false)}
                />
                <AharButton
                  label="Done"
                  onPress={() => {
                    onChange(to24hValue(tempDate));
                    setOpen(false);
                  }}
                />
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
    </>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    gap: SPACING.xs,
  },
  trigger: {
    height: 52,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.input,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    alignItems: "center",
    justifyContent: "space-between",
    flexDirection: "row",
  },
  leftContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  backdropPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    backgroundColor: COLORS.surface2,
    borderTopLeftRadius: BORDER_RADIUS.card,
    borderTopRightRadius: BORDER_RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xxl,
    gap: SPACING.lg,
    maxHeight: "70%",
  },
  dragHandle: {
    width: 52,
    height: 4,
    borderRadius: 999,
    alignSelf: "center",
    backgroundColor: COLORS.border,
    marginTop: -SPACING.sm,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: SPACING.md,
  },
});

export default AharTimePicker;
