import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, View } from "react-native";

import { BORDER_RADIUS, COLORS, SPACING } from "../../constants";
import type { Streak } from "../../types";
import { AharCard, AharText } from "../atoms";

export interface StreakPanelProps {
  streaks: Streak[];
}

const iconForType = (type: Streak["type"]): keyof typeof Ionicons.glyphMap => {
  if (type === "diet") {
    return "flame-outline";
  }

  if (type === "gym") {
    return "barbell-outline";
  }

  if (type === "water") {
    return "water-outline";
  }

  return "moon-outline";
};

export const StreakPanel = ({ streaks }: StreakPanelProps) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {streaks.map((streak) => (
        <AharCard key={streak.type} elevated style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons
              name={iconForType(streak.type)}
              size={20}
              color={COLORS.primary}
            />
          </View>
          {streak.currentStreak === 0 ? (
            <AharText variant="label" color={COLORS.textSecondary}>
              Start today!
            </AharText>
          ) : (
            <AharText variant="h2" weight="bold" color={COLORS.primary}>
              {streak.currentStreak}
            </AharText>
          )}
          <AharText variant="caption" color={COLORS.textSecondary}>
            {streak.type}
          </AharText>
          <AharText variant="caption" color={COLORS.textMuted}>
            Best: {streak.longestStreak}
          </AharText>
        </AharCard>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  row: {
    gap: SPACING.sm,
  },
  card: {
    width: 128,
    borderRadius: BORDER_RADIUS.card,
    gap: SPACING.xs,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
  },
});

export default StreakPanel;
