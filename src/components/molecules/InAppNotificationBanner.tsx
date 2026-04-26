import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS, SPACING } from "../../constants";
import { useUiStore } from "../../stores";
import { AharText } from "../atoms";

const iconForType = (type: string): keyof typeof Ionicons.glyphMap => {
  if (type === "meal_checkin") {
    return "restaurant-outline";
  }

  if (type === "water_reminder") {
    return "water-outline";
  }

  if (type === "walk_reminder") {
    return "walk-outline";
  }

  return "notifications-outline";
};

export const InAppNotificationBanner = () => {
  const insets = useSafeAreaInsets();
  const notification = useUiStore((state) => state.inAppNotification);
  const setInAppNotification = useUiStore(
    (state) => state.setInAppNotification,
  );

  const translateY = useRef(new Animated.Value(-180)).current;

  useEffect(() => {
    if (!notification) {
      return;
    }

    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 6,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(translateY, {
        toValue: -180,
        duration: 160,
        useNativeDriver: true,
      }).start(() => setInAppNotification(null));
    }, 4000);

    return () => clearTimeout(timer);
  }, [notification, setInAppNotification, translateY]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gestureState) =>
          Math.abs(gestureState.dy) > 8,
        onPanResponderMove: (_event, gestureState) => {
          if (gestureState.dy < 0) {
            translateY.setValue(gestureState.dy);
          }
        },
        onPanResponderRelease: (_event, gestureState) => {
          if (gestureState.dy < -28) {
            Animated.timing(translateY, {
              toValue: -180,
              duration: 140,
              useNativeDriver: true,
            }).start(() => setInAppNotification(null));
            return;
          }

          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        },
      }),
    [setInAppNotification, translateY],
  );

  if (!notification) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          paddingTop: insets.top + SPACING.sm,
          transform: [{ translateY }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <Pressable
        style={styles.content}
        onPress={() => {
          const screen = notification.data?.screen;
          if (screen === "plan") {
            router.push("/(tabs)/plan");
          } else {
            router.push("/(tabs)/dashboard");
          }

          setInAppNotification(null);
        }}
      >
        <View style={styles.leftBorder} />
        <View style={styles.inner}>
          <Ionicons
            name={iconForType(notification.type)}
            size={20}
            color={COLORS.secondary}
          />
          <View style={styles.textWrap}>
            <AharText variant="label" weight="bold">
              {notification.title}
            </AharText>
            <AharText variant="caption" color={COLORS.textSecondary}>
              {notification.body}
            </AharText>
          </View>
          <Pressable onPress={() => setInAppNotification(null)}>
            <Ionicons name="close" size={18} color={COLORS.textSecondary} />
          </Pressable>
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingHorizontal: SPACING.md,
  },
  content: {
    backgroundColor: COLORS.surface2,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  leftBorder: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: COLORS.primary,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
});

export default InAppNotificationBanner;
