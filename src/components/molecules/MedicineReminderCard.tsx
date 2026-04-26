import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

import { COLORS, SPACING } from "../../constants";
import type { MedicineReminder } from "../../types";
import { AharCard, AharText } from "../atoms";

interface MedicineReminderCardProps {
  reminder: MedicineReminder;
  onToggleActive: (active: boolean) => void;
  onDelete: () => void;
}

export const MedicineReminderCard = ({
  reminder,
  onToggleActive,
  onDelete,
}: MedicineReminderCardProps) => {
  return (
    <AharCard elevated style={styles.card}>
      <View style={styles.row}>
        <View style={styles.meta}>
          <AharText weight="bold">{reminder.name}</AharText>
          <AharText variant="caption" color={COLORS.textSecondary}>
            {reminder.dosage} • {reminder.time}{" "}
            {reminder.withFood ? "• With food" : ""}
          </AharText>
          {reminder.instructions ? (
            <AharText variant="caption" color={COLORS.textMuted}>
              {reminder.instructions}
            </AharText>
          ) : null}
        </View>
        <Pressable onPress={() => onToggleActive(!reminder.active)}>
          <Ionicons
            name={reminder.active ? "toggle" : "toggle-outline"}
            size={28}
            color={reminder.active ? COLORS.secondary : COLORS.textMuted}
          />
        </Pressable>
      </View>
      <Pressable onPress={onDelete} style={styles.deleteBtn}>
        <Ionicons name="trash-outline" size={14} color={COLORS.error} />
        <AharText variant="caption" color={COLORS.error}>
          Remove
        </AharText>
      </Pressable>
    </AharCard>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: SPACING.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },
  meta: {
    flex: 1,
    gap: 2,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
});

export default MedicineReminderCard;
