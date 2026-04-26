import { Ionicons } from "@expo/vector-icons";
import { Image, StyleSheet, View } from "react-native";

import { COLORS, SPACING } from "../../constants";
import type { LeaderboardEntry } from "../../types";
import { AharCard, AharText } from "../atoms";

interface LeaderboardCardProps {
  entry: LeaderboardEntry;
  highlight?: boolean;
}

export const LeaderboardCard = ({
  entry,
  highlight = false,
}: LeaderboardCardProps) => {
  const initials = entry.name
    .split(" ")
    .map((part) => part[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");

  const isTopThree = entry.rank <= 3;
  const rankColor =
    entry.rank === 1
      ? COLORS.warning
      : entry.rank === 2
        ? COLORS.textPrimary
        : entry.rank === 3
          ? COLORS.accent
          : COLORS.secondary;

  const rankBadgeStyle =
    entry.rank === 1
      ? styles.rankFirst
      : entry.rank === 2
        ? styles.rankSecond
        : entry.rank === 3
          ? styles.rankThird
          : styles.rankDefault;

  return (
    <AharCard
      elevated
      style={[styles.card, highlight ? styles.highlight : null]}
    >
      <View style={styles.row}>
        <View style={[styles.rankBadge, rankBadgeStyle]}>
          {isTopThree ? (
            <Ionicons name="trophy" size={14} color={rankColor} />
          ) : null}
          <AharText variant="label" weight="bold" color={rankColor}>
            #{entry.rank}
          </AharText>
        </View>
        <View style={styles.avatarWrap}>
          {entry.avatarUrl ? (
            <Image source={{ uri: entry.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <AharText variant="caption" weight="bold">
                {initials}
              </AharText>
            </View>
          )}
        </View>
        <View style={styles.meta}>
          <AharText weight="bold">{entry.name}</AharText>
          <View style={styles.scorePill}>
            <Ionicons name="sparkles" size={12} color={COLORS.accent} />
            <AharText
              variant="caption"
              weight="medium"
              color={COLORS.textPrimary}
            >
              Score {entry.score}
            </AharText>
          </View>
          <View style={styles.statsRow}>
            <AharText variant="caption" color={COLORS.textSecondary}>
              Meals {entry.mealComplianceRate}%
            </AharText>
            <AharText variant="caption" color={COLORS.textSecondary}>
              Gym {entry.gymDaysActual}d
            </AharText>
            <AharText variant="caption" color={COLORS.textSecondary}>
              Streak {entry.streakDays}d
            </AharText>
          </View>
        </View>
      </View>
    </AharCard>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
  },
  highlight: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.surface2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  rankBadge: {
    minWidth: 54,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: COLORS.surface2,
  },
  rankFirst: {
    borderColor: COLORS.warning,
  },
  rankSecond: {
    borderColor: COLORS.textPrimary,
  },
  rankThird: {
    borderColor: COLORS.accent,
  },
  rankDefault: {
    borderColor: COLORS.secondary,
  },
  avatarWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface2,
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  avatarFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  meta: {
    flex: 1,
    gap: 6,
  },
  scorePill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.xs,
  },
});

export default LeaderboardCard;
