import { Ionicons } from "@expo/vector-icons";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  AharCard,
  AharText,
  EmptyState,
  SkeletonCard,
} from "../../../src/components/atoms";
import { LeaderboardCard } from "../../../src/components/molecules";
import { COLORS, SPACING } from "../../../src/constants";
import { useLeaderboard } from "../../../src/hooks";

export const LeaderboardScreen = () => {
  const { leaderboard, isLoading, isRefetching, refetch } = useLeaderboard();
  const topThree = (leaderboard?.entries ?? []).slice(0, 3);
  const others = (leaderboard?.entries ?? []).slice(3);

  if (isLoading && !leaderboard) {
    return (
      <View style={styles.centered}>
        <SkeletonCard lines={4} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
            tintColor={COLORS.primary}
          />
        }
      >
        <AharText variant="h2" weight="bold">
          Community leaderboard
        </AharText>
        <AharText variant="caption" color={COLORS.textSecondary}>
          Ranked by latest weekly wellness score.
        </AharText>

        <AharCard elevated style={styles.heroCard}>
          <View style={styles.heroTitleRow}>
            <Ionicons name="trophy" size={18} color={COLORS.warning} />
            <AharText variant="label" weight="bold">
              Weekly challenge
            </AharText>
          </View>
          <AharText variant="caption" color={COLORS.textSecondary}>
            {leaderboard?.totalUsers ?? 0} users are competing this week.
          </AharText>
        </AharCard>

        {leaderboard?.currentUser ? (
          <>
            <AharText variant="label" weight="medium" color={COLORS.accent}>
              Your rank
            </AharText>
            <LeaderboardCard entry={leaderboard.currentUser} highlight />
          </>
        ) : null}

        <AharText variant="label" weight="medium">
          Top users
        </AharText>
        {topThree.map((entry) => (
          <LeaderboardCard
            key={`${entry.userId}-${entry.rank}`}
            entry={entry}
          />
        ))}

        {others.length ? (
          <>
            <AharText variant="label" weight="medium">
              All rankings
            </AharText>
            {others.map((entry) => (
              <LeaderboardCard
                key={`${entry.userId}-${entry.rank}`}
                entry={entry}
              />
            ))}
          </>
        ) : null}

        {!leaderboard?.entries.length ? (
          <EmptyState
            icon="trophy-outline"
            title="No leaderboard data yet"
            subtitle="Complete weekly check-ins to appear here."
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    padding: SPACING.lg,
    paddingBottom: 120,
    gap: SPACING.md,
  },
  heroCard: {
    gap: SPACING.xs,
    borderColor: COLORS.secondary,
  },
  heroTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
  },
});

export default LeaderboardScreen;
