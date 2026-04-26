import { StyleSheet, View } from "react-native";

import { SPACING } from "../../constants";
import { AharCard, AharText } from "../atoms";

export interface OnboardingStepProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export const OnboardingStep = ({
  title,
  subtitle,
  children,
}: OnboardingStepProps) => {
  return (
    <AharCard elevated style={styles.card}>
      <View style={styles.header}>
        <AharText variant="h2" weight="bold">
          {title}
        </AharText>
        <AharText variant="label">{subtitle}</AharText>
      </View>

      <View style={styles.content}>{children}</View>
    </AharCard>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: "76%",
  },
  header: {
    gap: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  content: {
    flex: 1,
    gap: SPACING.lg,
  },
});

export default OnboardingStep;
