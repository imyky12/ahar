import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { COLORS, SPACING } from "../../constants";
import type { Badge } from "../../types";
import { AharCard, AharText } from "../atoms";

export interface BadgeGalleryProps {
  badges: Badge[];
}

export const BadgeGallery = ({ badges }: BadgeGalleryProps) => {
  if (!badges.length) {
    return (
      <AharCard>
        <AharText variant="h3" weight="bold">
          Badge gallery
        </AharText>
        <AharText variant="body" color={COLORS.textSecondary}>
          Keep logging daily actions to unlock badges.
        </AharText>
      </AharCard>
    );
  }

  return (
    <AharCard>
      <AharText variant="h3" weight="bold">
        Badge gallery
      </AharText>
      <View style={styles.grid}>
        {badges.map((badge) => (
          <View
            key={`${badge.badgeId}-${badge.earnedAt}`}
            style={styles.badgeTile}
          >
            <Ionicons
              name={badge.icon as keyof typeof Ionicons.glyphMap}
              size={22}
              color={badge.isNew ? COLORS.accent : COLORS.secondary}
            />
            <AharText variant="caption" weight="bold">
              {badge.label}
            </AharText>
            {badge.isNew ? (
              <AharText variant="caption" color={COLORS.accent}>
                NEW
              </AharText>
            ) : null}
          </View>
        ))}
      </View>
    </AharCard>
  );
};

const styles = StyleSheet.create({
  grid: {
    marginTop: SPACING.md,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  badgeTile: {
    width: "31%",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: SPACING.sm,
    alignItems: "center",
    gap: SPACING.xs,
    backgroundColor: COLORS.surface2,
  },
});

export default BadgeGallery;
