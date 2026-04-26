import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type TextInputProps,
} from "react-native";

import { BORDER_RADIUS, COLORS, SPACING, TYPOGRAPHY } from "../../constants";

export interface AharInputProps {
  label?: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  leftIcon?: TextInputProps["inputMode"] extends never
    ? never
    : keyof typeof Ionicons.glyphMap;
  rightIcon?: TextInputProps["inputMode"] extends never
    ? never
    : keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  multiline?: boolean;
  numberOfLines?: number;
}

export const AharInput = ({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  secureTextEntry = false,
  keyboardType = "default",
  leftIcon,
  rightIcon,
  onRightIconPress,
  multiline = false,
  numberOfLines,
}: AharInputProps) => {
  const [isFocused, setIsFocused] = useState(false);

  const borderColor = useMemo(() => {
    if (error) {
      return COLORS.error;
    }

    return isFocused ? COLORS.primary : COLORS.border;
  }, [error, isFocused]);

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.inputContainer, { borderColor }]}>
        {leftIcon ? (
          <Ionicons
            name={leftIcon}
            size={20}
            color={COLORS.textSecondary}
            style={styles.leftIcon}
          />
        ) : null}
        <TextInput
          style={[styles.input, multiline ? styles.multilineInput : null]}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize="none"
          multiline={multiline}
          numberOfLines={numberOfLines}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        {rightIcon ? (
          <Pressable onPress={onRightIconPress} style={styles.rightButton}>
            <Ionicons name={rightIcon} size={20} color={COLORS.textSecondary} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    gap: SPACING.xs,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  inputContainer: {
    height: 52,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.input,
    backgroundColor: COLORS.surface,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
  },
  leftIcon: {
    marginRight: SPACING.sm,
  },
  rightButton: {
    marginLeft: SPACING.sm,
  },
  input: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.size.md,
    paddingVertical: 0,
  },
  multilineInput: {
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
    textAlignVertical: "top",
    minHeight: 72,
  },
  error: {
    color: COLORS.error,
    fontSize: TYPOGRAPHY.size.xs,
  },
});

export default AharInput;
