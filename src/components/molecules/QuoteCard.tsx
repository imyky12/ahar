import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

import type { MotivationalQuote } from "../../constants/quotes";
import { COLORS, SPACING } from "../../constants";
import { AharCard, AharText } from "../atoms";

interface QuoteCardProps {
  quote: MotivationalQuote;
}

export const QuoteCard = ({ quote }: QuoteCardProps) => {
  return (
    <AharCard elevated style={styles.card}>
      <View style={styles.row}>
        <Ionicons
          name="chatbubble-ellipses-outline"
          size={18}
          color={COLORS.secondary}
        />
        <AharText variant="caption" color={COLORS.textSecondary}>
          Quote of the day
        </AharText>
      </View>
      <AharText weight="medium">“{quote.text}”</AharText>
      <AharText variant="caption" color={COLORS.textMuted}>
        — {quote.author}
      </AharText>
    </AharCard>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: SPACING.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
});

export default QuoteCard;
