import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

import { BORDER_RADIUS, COLORS, SPACING } from "../../constants";
import { AharCard, AharText } from "../atoms";

export interface QuickActionsProps {
  onWaterLog: () => void;
  onGymLog: () => void;
  onSleepLog: () => void;
  onEnergyLog: () => void;
  onMedicineLog: () => void;
}

const ActionCard = ({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) => {
  return (
    <AharCard elevated style={styles.actionCard} onPress={onPress}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={32} color={COLORS.primary} />
      </View>
      <AharText variant="label" weight="medium" style={styles.centerText}>
        {label}
      </AharText>
    </AharCard>
  );
};

export const QuickActions = ({
  onWaterLog,
  onGymLog,
  onSleepLog,
  onEnergyLog,
  onMedicineLog,
}: QuickActionsProps) => {
  return (
    <View style={styles.grid}>
      <ActionCard icon="water-outline" label="Log Water" onPress={onWaterLog} />
      <ActionCard icon="barbell-outline" label="Log Gym" onPress={onGymLog} />
      <ActionCard icon="moon-outline" label="Log Sleep" onPress={onSleepLog} />
      <ActionCard icon="flash-outline" label="Energy" onPress={onEnergyLog} />
      <ActionCard icon="medkit-outline" label="Medicines" onPress={onMedicineLog} />
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  actionCard: {
    width: "48%",
    backgroundColor: COLORS.surface,
    alignItems: "center",
    gap: SPACING.sm,
    borderRadius: BORDER_RADIUS.card,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  centerText: {
    textAlign: "center",
  },
});

export default QuickActions;
