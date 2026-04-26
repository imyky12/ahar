import { Animated, Easing } from "react-native";

export const fadeIn = (value: Animated.Value, duration = 300): void => {
  Animated.timing(value, {
    toValue: 1,
    duration,
    easing: Easing.out(Easing.quad),
    useNativeDriver: true,
  }).start();
};

export const fadeOut = (value: Animated.Value, duration = 200): void => {
  Animated.timing(value, {
    toValue: 0,
    duration,
    easing: Easing.out(Easing.quad),
    useNativeDriver: true,
  }).start();
};

export const slideUp = (value: Animated.Value, duration = 350): void => {
  Animated.timing(value, {
    toValue: 0,
    duration,
    easing: Easing.out(Easing.back(1.2)),
    useNativeDriver: true,
  }).start();
};

export const scaleIn = (value: Animated.Value, duration = 300): void => {
  Animated.spring(value, {
    toValue: 1,
    tension: 100,
    friction: 8,
    useNativeDriver: true,
  }).start();
};

export const pulse = (value: Animated.Value): void => {
  Animated.loop(
    Animated.sequence([
      Animated.timing(value, {
        toValue: 1.1,
        duration: 600,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(value, {
        toValue: 1,
        duration: 600,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ]),
  ).start();
};

export const shimmer = (value: Animated.Value): void => {
  Animated.loop(
    Animated.sequence([
      Animated.timing(value, {
        toValue: 0.7,
        duration: 600,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(value, {
        toValue: 0.3,
        duration: 600,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ]),
  ).start();
};
