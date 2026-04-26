import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";

import { COLORS, SPACING } from "../../constants";
import { offlineManager } from "../../utils";
import { fadeIn, fadeOut } from "../../utils";
import { AharText } from "../atoms";

export const NetworkStatusBanner = () => {
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [message, setMessage] = useState(
    "No internet connection — showing cached data",
  );
  const [bg, setBg] = useState<string>(COLORS.error);
  const [icon, setIcon] =
    useState<keyof typeof Ionicons.glyphMap>("wifi-outline");

  useEffect(() => {
    const unsubscribe = offlineManager.subscribe((isOnline) => {
      if (!isOnline) {
        setMessage("No internet connection — showing cached data");
        setBg(COLORS.error);
        setIcon("wifi-outline");
        Animated.timing(translateY, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }).start();
        fadeIn(opacity, 200);
        return;
      }

      setMessage("Back online ✓");
      setBg(COLORS.success);
      setIcon("wifi");
      Animated.timing(translateY, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start(() => {
        setTimeout(() => {
          fadeOut(opacity, 250);
          setTimeout(() => {
            translateY.setValue(-80);
          }, 260);
        }, 2000);
      });
      fadeIn(opacity, 200);
    });

    return unsubscribe;
  }, [translateY]);

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY }], backgroundColor: bg, opacity },
      ]}
    >
      <View style={styles.row}>
        <Ionicons name={icon} size={16} color={COLORS.textPrimary} />
        <AharText variant="caption" color={COLORS.textPrimary}>
          {message}
        </AharText>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9998,
    paddingTop: 44,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
});

export default NetworkStatusBanner;
