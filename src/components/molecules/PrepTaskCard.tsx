import { Pressable, StyleSheet, View } from "react-native";

import type { PrepTask } from "../../types";
import { BORDER_RADIUS, COLORS, SPACING } from "../../constants";
import { AharCard, AharText } from "../atoms";

export interface PrepTaskCardProps {
  task: PrepTask;
  onToggle: (isDone: boolean) => void;
}

const typeColor: Record<PrepTask["type"], string> = {
  soak: "#4C8DFF",
  marinate: "#F4A261",
  defrost: "#4CC9F0",
  other: "#8FA3B1",
};

export const PrepTaskCard = ({ task, onToggle }: PrepTaskCardProps) => {
  return (
    <AharCard
      style={[styles.card, task.isDone ? styles.doneCard : null]}
      onPress={() => onToggle(!task.isDone)}
    >
      <View style={styles.row}>
        <View style={styles.left}>
          <AharText
            variant="body"
            style={task.isDone ? styles.doneText : undefined}
            color={task.isDone ? COLORS.textMuted : COLORS.textPrimary}
          >
            {task.instruction}
          </AharText>
          <AharText variant="caption" color={COLORS.textSecondary}>
            {task.scheduledFor}
          </AharText>
        </View>

        <View style={[styles.badge, { backgroundColor: typeColor[task.type] }]}>
          <AharText variant="caption" color={COLORS.textPrimary}>
            {task.type}
          </AharText>
        </View>

        <Pressable
          onPress={() => onToggle(!task.isDone)}
          style={[styles.checkbox, task.isDone ? styles.checkboxChecked : null]}
        />
      </View>
    </AharCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: SPACING.sm,
  },
  doneCard: {
    opacity: 0.75,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  left: {
    flex: 1,
    gap: SPACING.xs,
  },
  doneText: {
    textDecorationLine: "line-through",
  },
  badge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.button,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
});

export default PrepTaskCard;
