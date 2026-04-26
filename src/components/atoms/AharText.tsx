import { Text, StyleSheet, type StyleProp, type TextStyle } from "react-native";

import { COLORS, TYPOGRAPHY } from "../../constants";

type AharTextVariant = "h1" | "h2" | "h3" | "body" | "caption" | "label";
type AharTextWeight = "regular" | "medium" | "bold";

export interface AharTextProps {
  variant?: AharTextVariant;
  color?: string;
  weight?: AharTextWeight;
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
  numberOfLines?: number;
}

const variantStyles: Record<AharTextVariant, TextStyle> = {
  h1: { fontSize: 28, lineHeight: 34 },
  h2: { fontSize: 22, lineHeight: 28 },
  h3: { fontSize: 18, lineHeight: 24 },
  body: { fontSize: 16, lineHeight: 22 },
  caption: { fontSize: 12, lineHeight: 16 },
  label: { fontSize: 14, lineHeight: 18 },
};

const weightMap: Record<AharTextWeight, TextStyle["fontWeight"]> = {
  regular: TYPOGRAPHY.weight.regular,
  medium: TYPOGRAPHY.weight.medium,
  bold: TYPOGRAPHY.weight.bold,
};

export const AharText = ({
  variant = "body",
  color = COLORS.textPrimary,
  weight = "regular",
  style,
  children,
  numberOfLines,
}: AharTextProps) => {
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        styles.base,
        variantStyles[variant],
        { color, fontWeight: weightMap[weight] },
        style,
      ]}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  base: {
    color: COLORS.textPrimary,
  },
});

export default AharText;
