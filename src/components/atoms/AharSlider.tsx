import Slider from "@react-native-community/slider";
import { useEffect, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";

import { BORDER_RADIUS, COLORS, SPACING } from "../../constants";
import { AharText } from "./AharText";

export interface AharSliderProps {
  label: string;
  value: number;
  minimumValue: number;
  maximumValue: number;
  step?: number;
  suffix?: string;
  onValueChange: (value: number) => void;
}

export const AharSlider = ({
  label,
  value,
  minimumValue,
  maximumValue,
  step = 1,
  suffix,
  onValueChange,
}: AharSliderProps) => {
  const [inputValue, setInputValue] = useState(String(Math.round(value)));

  useEffect(() => {
    setInputValue(String(Math.round(value)));
  }, [value]);

  const commitInput = (): void => {
    const parsed = Number(inputValue);
    if (Number.isNaN(parsed)) {
      setInputValue(String(Math.round(value)));
      return;
    }

    const clamped = Math.max(minimumValue, Math.min(maximumValue, parsed));
    onValueChange(clamped);
    setInputValue(String(Math.round(clamped)));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AharText variant="label" color={COLORS.textSecondary}>
          {label}
        </AharText>
        <View style={styles.valueRow}>
          <TextInput
            style={styles.valueInput}
            value={inputValue}
            keyboardType="numeric"
            returnKeyType="done"
            maxLength={4}
            onChangeText={setInputValue}
            onBlur={commitInput}
            onSubmitEditing={commitInput}
            placeholderTextColor={COLORS.textMuted}
            selectionColor={COLORS.primary}
          />
          <AharText variant="label" color={COLORS.textSecondary}>
            {suffix ?? ""}
          </AharText>
        </View>
      </View>

      <Slider
        value={value}
        minimumValue={minimumValue}
        maximumValue={maximumValue}
        step={step}
        minimumTrackTintColor={COLORS.primary}
        maximumTrackTintColor={COLORS.border}
        thumbTintColor={COLORS.accent}
        onValueChange={onValueChange}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    gap: SPACING.xs,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  valueInput: {
    width: 64,
    height: 40,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.input,
    backgroundColor: COLORS.surface,
    color: COLORS.textPrimary,
    textAlign: "center",
    paddingHorizontal: SPACING.xs,
    fontSize: 15,
    fontWeight: "600",
  },
});

export default AharSlider;
