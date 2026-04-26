import { StyleSheet, View } from "react-native";

import { SPACING } from "../../constants";
import { AharCard } from "./AharCard";
import { SkeletonLoader } from "./SkeletonLoader";

export interface SkeletonCardProps {
  lines?: number;
}

export const SkeletonCard = ({ lines = 3 }: SkeletonCardProps) => {
  return (
    <AharCard style={styles.card}>
      <SkeletonLoader width="70%" height={18} />
      <View style={styles.lines}>
        {Array.from({ length: lines }).map((_, index) => (
          <SkeletonLoader
            key={index}
            width={index === lines - 1 ? "55%" : "100%"}
            height={12}
          />
        ))}
      </View>
    </AharCard>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: SPACING.sm,
  },
  lines: {
    gap: SPACING.xs,
  },
});

export default SkeletonCard;
