import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import * as Haptics from "expo-haptics";

import { BORDER_RADIUS, COLORS, SPACING, TYPOGRAPHY } from "../../constants";

type AharButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type AharButtonSize = "sm" | "md" | "lg";

export interface AharButtonProps {
  label: string;
  onPress: () => void;
  variant?: AharButtonVariant;
  size?: AharButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

const sizeStyles: Record<
  AharButtonSize,
  { paddingVertical: number; paddingHorizontal: number; fontSize: number }
> = {
  sm: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    fontSize: TYPOGRAPHY.size.sm,
  },
  md: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    fontSize: TYPOGRAPHY.size.md,
  },
  lg: {
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xxl,
    fontSize: TYPOGRAPHY.size.lg,
  },
};

export const AharButton = ({
  label,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
}: AharButtonProps) => {
  const variantStyle =
    variant === "secondary"
      ? styles.secondary
      : variant === "ghost"
        ? styles.ghost
        : variant === "danger"
          ? styles.danger
          : styles.primary;

  const textStyle =
    variant === "secondary"
      ? styles.secondaryText
      : variant === "ghost"
        ? styles.ghostText
        : styles.primaryText;

  const buttonSize = sizeStyles[size];
  const isDisabled = disabled || loading;

  const handlePress = (): void => {
    if (variant === "primary" || variant === "danger") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled}
      style={[
        styles.base,
        variantStyle,
        {
          paddingVertical: buttonSize.paddingVertical,
          paddingHorizontal: buttonSize.paddingHorizontal,
          width: fullWidth ? "100%" : undefined,
        },
        isDisabled ? styles.disabled : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={
            variant === "secondary" || variant === "ghost"
              ? COLORS.primary
              : COLORS.textPrimary
          }
        />
      ) : (
        <Text
          style={[styles.label, textStyle, { fontSize: buttonSize.fontSize }]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: BORDER_RADIUS.button,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  secondary: {
    backgroundColor: "transparent",
    borderColor: COLORS.primary,
  },
  ghost: {
    backgroundColor: "transparent",
    borderColor: "transparent",
  },
  danger: {
    backgroundColor: COLORS.error,
    borderColor: COLORS.error,
  },
  label: {
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  primaryText: {
    color: COLORS.textPrimary,
  },
  secondaryText: {
    color: COLORS.primary,
  },
  ghostText: {
    color: COLORS.textSecondary,
  },
  disabled: {
    opacity: 0.6,
  },
});

export default AharButton;
