import { Pressable, StyleSheet, View } from "react-native";

import { BORDER_RADIUS, COLORS, SPACING } from "../../constants";
import { AharText } from "./AharText";

export interface AharChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
}

export const AharChip = ({
  label,
  selected = false,
  onPress,
}: AharChipProps) => {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.base, selected ? styles.selected : styles.unselected]}
    >
      <View>
        <AharText
          variant="label"
          weight={selected ? "bold" : "medium"}
          color={selected ? COLORS.textPrimary : COLORS.textSecondary}
        >
          {label}
        </AharText>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.button,
    borderWidth: 1,
  },
  selected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  unselected: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
  },
});

export default AharChip;
