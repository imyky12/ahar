import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, View } from "react-native";

import { BORDER_RADIUS, COLORS, SPACING } from "../../constants";
import { AharButton } from "./AharButton";
import { AharText } from "./AharText";

export interface AharDatePickerProps {
  label: string;
  value?: string;
  onChange: (value: string) => void;
}

const toDate = (value?: string): Date => {
  if (!value) {
    return new Date();
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return new Date();
  }

  return date;
};

const toIsoDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const displayDate = (value?: string): string => {
  if (!value) {
    return "Select date";
  }

  const date = toDate(value);
  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const AharDatePicker = ({
  label,
  value,
  onChange,
}: AharDatePickerProps) => {
  const [open, setOpen] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(toDate(value));

  const shown = useMemo(() => displayDate(value), [value]);

  const onDateChange = (event: DateTimePickerEvent, nextDate?: Date): void => {
    if (Platform.OS === "android") {
      if (event.type === "dismissed") {
        setOpen(false);
        return;
      }

      if (nextDate) {
        onChange(toIsoDate(nextDate));
      }
      setOpen(false);
      return;
    }

    if (nextDate) {
      setTempDate(nextDate);
    }
  };

  const close = (): void => {
    setOpen(false);
  };

  return (
    <>
      <View style={styles.wrapper}>
        <AharText variant="label" color={COLORS.textSecondary}>
          {label}
        </AharText>

        <Pressable
          style={styles.trigger}
          onPress={() => {
            setTempDate(toDate(value));
            setOpen(true);
          }}
        >
          <View style={styles.leftContent}>
            <Ionicons
              name="calendar-outline"
              size={18}
              color={COLORS.textSecondary}
            />
            <AharText>{shown}</AharText>
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
          mode="date"
          value={tempDate}
          onChange={onDateChange}
          display="calendar"
          maximumDate={new Date()}
        />
      ) : null}

      {Platform.OS === "ios" ? (
        <Modal
          transparent
          visible={open}
          animationType="fade"
          onRequestClose={close}
        >
          <View style={styles.backdrop}>
            <Pressable style={styles.backdropPressable} onPress={close} />
            <View style={styles.modalCard}>
              <View style={styles.dragHandle} />
              <AharText variant="h3" weight="bold">
                Pick date
              </AharText>

              <DateTimePicker
                mode="date"
                value={tempDate}
                onChange={onDateChange}
                display="spinner"
                maximumDate={new Date()}
                themeVariant="dark"
              />

              <View style={styles.actions}>
                <AharButton label="Cancel" variant="ghost" onPress={close} />
                <AharButton
                  label="Done"
                  onPress={() => {
                    onChange(toIsoDate(tempDate));
                    close();
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

export default AharDatePicker;
