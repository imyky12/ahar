import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Platform, StyleSheet, View } from "react-native";

import { BORDER_RADIUS, COLORS, SPACING } from "../../constants";
import { AharText } from "./AharText";

type ToastType = "success" | "warning" | "error" | "info";

interface ToastState {
  message: string;
  type: ToastType;
  duration: number;
}

let globalShowToast:
  | ((message: string, type?: ToastType, duration?: number) => void)
  | null = null;

export const useToast = () => {
  return {
    showToast: (message: string, type: ToastType = "info", duration = 3000) => {
      globalShowToast?.(message, type, duration);
    },
  };
};

export interface AharToastProps {
  onDismiss?: () => void;
}

export const AharToast = ({ onDismiss }: AharToastProps) => {
  const [state, setState] = useState<ToastState | null>(null);
  const translateY = useRef(new Animated.Value(100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    globalShowToast = (message, type = "info", duration = 3000) => {
      setState({ message, type, duration });
    };

    return () => {
      globalShowToast = null;
    };
  }, []);

  useEffect(() => {
    if (!state) {
      return;
    }

    translateY.setValue(100);
    opacity.setValue(0);

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 80,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 140,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setState(null);
        onDismiss?.();
      });
    }, state.duration);

    return () => {
      clearTimeout(timer);
    };
  }, [onDismiss, opacity, state, translateY]);

  const backgroundColor = useMemo(() => {
    if (!state) {
      return COLORS.primary;
    }

    if (state.type === "success") {
      return COLORS.success;
    }

    if (state.type === "warning") {
      return COLORS.warning;
    }

    if (state.type === "error") {
      return COLORS.error;
    }

    return COLORS.primary;
  }, [state]);

  if (!state) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
      pointerEvents="none"
    >
      <View style={[styles.toast, { backgroundColor }]}>
        <AharText weight="medium" color={COLORS.textPrimary}>
          {state.message}
        </AharText>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: SPACING.lg,
    right: SPACING.lg,
    bottom: SPACING.xxl,
    zIndex: 9999,
  },
  toast: {
    borderRadius: BORDER_RADIUS.card,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: Platform.OS === "android" ? 6 : 0,
  },
});

export default AharToast;
