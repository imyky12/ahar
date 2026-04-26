import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

import { COLORS } from "../../constants";
import { useUiStore } from "../../stores";
import { AharBadge } from "../atoms";

export interface NotificationBellProps {
  onPress: () => void;
}

export const NotificationBell = ({ onPress }: NotificationBellProps) => {
  const unreadCount = useUiStore((state) => state.unreadNotificationCount);

  return (
    <Pressable style={styles.container} onPress={onPress}>
      <Ionicons
        name="notifications-outline"
        size={22}
        color={COLORS.textPrimary}
      />
      <View style={styles.badgeWrap}>
        <AharBadge count={unreadCount} />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeWrap: {
    position: "absolute",
    top: -4,
    right: -6,
  },
});

export default NotificationBell;
