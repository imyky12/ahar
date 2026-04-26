import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

import { COLORS, SPACING } from "../../constants";
import { AharButton } from "./AharButton";
import { AharText } from "./AharText";

export interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
}

export const EmptyState = ({
  icon,
  title,
  subtitle,
  action,
}: EmptyStateProps) => {
  return (
    <View style={styles.root}>
      <Ionicons name={icon} size={48} color={COLORS.textMuted} />
      <AharText variant="h3" weight="bold" color={COLORS.textSecondary}>
        {title}
      </AharText>
      {subtitle ? (
        <AharText variant="body" color={COLORS.textMuted}>
          {subtitle}
        </AharText>
      ) : null}
      {action ? (
        <AharButton label={action.label} onPress={action.onPress} />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    padding: SPACING.xl,
  },
});

export default EmptyState;
