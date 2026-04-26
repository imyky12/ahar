import { Pressable, StyleSheet, View } from "react-native";

import type { GroceryItem } from "../../types";
import { COLORS, SPACING } from "../../constants";
import { AharCard, AharText } from "../atoms";

export interface GroceryItemCardProps {
  item: GroceryItem;
  onToggleAvailable: () => void;
}

export const GroceryItemCard = ({
  item,
  onToggleAvailable,
}: GroceryItemCardProps) => {
  return (
    <AharCard style={[styles.card, item.isAvailable ? styles.doneCard : null]}>
      <View style={styles.row}>
        <View style={styles.left}>
          <AharText
            variant="body"
            weight="medium"
            style={item.isAvailable ? styles.doneText : undefined}
            color={item.isAvailable ? COLORS.textMuted : COLORS.textPrimary}
          >
            {item.name}
          </AharText>
          <AharText variant="caption" color={COLORS.textSecondary}>
            {item.quantity} {item.unit}
          </AharText>
        </View>

        <Pressable
          onPress={onToggleAvailable}
          style={[styles.checkbox, item.isAvailable ? styles.checked : null]}
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
    justifyContent: "space-between",
    gap: SPACING.sm,
  },
  left: {
    flex: 1,
    gap: SPACING.xs,
  },
  doneText: {
    textDecorationLine: "line-through",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  checked: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
});

export default GroceryItemCard;
