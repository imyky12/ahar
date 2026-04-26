import { StyleSheet, View } from "react-native";

import { BORDER_RADIUS, COLORS, SPACING } from "../../constants";

export interface AharProgressBarProps {
  progress: number;
}

export const AharProgressBar = ({ progress }: AharProgressBarProps) => {
  const clamped = Math.min(1, Math.max(0, progress));

  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${clamped * 100}%` }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    width: "100%",
    height: 8,
    borderRadius: BORDER_RADIUS.input,
    backgroundColor: COLORS.border,
    overflow: "hidden",
    marginVertical: SPACING.sm,
  },
  fill: {
    height: "100%",
    backgroundColor: COLORS.secondary,
    borderRadius: BORDER_RADIUS.input,
  },
});

export default AharProgressBar;
