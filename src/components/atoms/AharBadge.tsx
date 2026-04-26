import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { BORDER_RADIUS, COLORS, SPACING } from "../../constants";
import { AharText } from "./AharText";

export interface AharBadgeProps {
  count: number;
  style?: StyleProp<ViewStyle>;
}

export const AharBadge = ({ count, style }: AharBadgeProps) => {
  if (count <= 0) {
    return null;
  }

  return (
    <View style={[styles.badge, style]}>
      <AharText variant="caption" weight="bold" color={COLORS.textPrimary}>
        {count > 99 ? "99+" : String(count)}
      </AharText>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: BORDER_RADIUS.button,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.xs,
  },
});

export default AharBadge;
