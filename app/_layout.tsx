import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { router, Stack, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppState, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import {
  AharToast,
  ErrorBoundary,
  SkeletonCard,
} from "../src/components/atoms";
import {
  EnergyCheckinModal,
  GymLogModal,
  InAppNotificationBanner,
  NetworkStatusBanner,
  PeriodCheckinModal,
  SleepCheckinModal,
} from "../src/components/molecules";
import { COLORS } from "../src/constants/theme";
import { useNotifications } from "../src/hooks";
import { getProfile } from "../src/services/profileService";
import {
  handleNotificationResponse,
  setupNotificationHandlers,
} from "../src/services/notificationService";
import { useAuthStore, useProfileStore, useUiStore } from "../src/stores";
import { offlineManager, processQueue } from "../src/utils";

interface PersistedAuthPayload {
  state?: {
    user?: {
      _id: string;
      email: string;
      createdAt: Date;
      updatedAt: Date;
    } | null;
    token?: string | null;
    refreshToken?: string | null;
    isAuthenticated?: boolean;
  };
}

const RootOverlays = () => {
  const { initialize } = useNotifications();
  const setCurrentDate = useUiStore((state) => state.setCurrentDate);
  const appState = useRef(AppState.currentState);
  const lastResponse = Notifications.useLastNotificationResponse();
  const handledResponseId = useRef<string | null>(null);

  useEffect(() => {
    const todayStr = () => new Date().toISOString().slice(0, 10);

    // Seed correct date on mount and clear badge count
    setCurrentDate(todayStr());
    void Notifications.setBadgeCountAsync(0);

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (appState.current !== "active" && nextState === "active") {
        setCurrentDate(todayStr());
        void Notifications.setBadgeCountAsync(0);
      }
      appState.current = nextState;
    });

    return () => {
      subscription.remove();
    };
  }, [setCurrentDate]);

  useEffect(() => {
    if (!lastResponse) {
      return;
    }
    const id = lastResponse.notification.request.identifier;
    if (handledResponseId.current === id) {
      return;
    }
    handledResponseId.current = id;
    handleNotificationResponse(lastResponse, router);
  }, [lastResponse]);

  useEffect(() => {
    offlineManager.initialize();
    const unsubscribe = offlineManager.subscribe((isOnline) => {
      if (isOnline) {
        void processQueue();
      }
    });

    void initialize();
    const cleanup = setupNotificationHandlers(router);

    return () => {
      unsubscribe();
      cleanup();
    };
  }, [initialize]);

  return (
    <>
      <NetworkStatusBanner />
      <InAppNotificationBanner />
      <EnergyCheckinModal />
      <SleepCheckinModal />
      <GymLogModal />
      <PeriodCheckinModal />
      <AharToast />
    </>
  );
};

export const RootLayout = () => {
  const [isRehydrating, setIsRehydrating] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const queryClient = useMemo(() => new QueryClient(), []);
  const pathname = usePathname();

  const token = useAuthStore((state) => state.token);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const setAuth = useAuthStore((state) => state.setAuth);

  const profile = useProfileStore((state) => state.profile);
  const setProfile = useProfileStore((state) => state.setProfile);
  const clearProfile = useProfileStore((state) => state.clearProfile);

  useEffect(() => {
    const rehydrateAuth = async (): Promise<void> => {
      try {
        const rawValue = await SecureStore.getItemAsync("ahar-auth-store");

        if (rawValue) {
          const parsed = JSON.parse(rawValue) as PersistedAuthPayload;
          const persistedUser = parsed.state?.user;
          const persistedToken = parsed.state?.token;
          const persistedRefreshToken = parsed.state?.refreshToken;

          if (persistedUser && persistedToken && persistedRefreshToken) {
            setAuth({
              user: persistedUser,
              token: persistedToken,
              refreshToken: persistedRefreshToken,
            });
          } else {
            clearAuth();
          }
        } else {
          clearAuth();
        }
      } catch {
        clearAuth();
      } finally {
        setIsRehydrating(false);
      }
    };

    void rehydrateAuth();
  }, [clearAuth, setAuth]);

  useEffect(() => {
    const loadProfile = async (): Promise<void> => {
      if (!isAuthenticated || !token || !refreshToken) {
        clearProfile();
        setIsProfileLoading(false);
        return;
      }

      setIsProfileLoading(true);
      try {
        const nextProfile = await getProfile();
        if (nextProfile) {
          setProfile(nextProfile);
        } else {
          clearProfile();
        }
      } catch (err) {
        // Only clear profile on explicit auth rejection.
        // Transient errors (timeout, 5xx, network blip) must NOT wipe the
        // profile — doing so sends an onboarded user back to onboarding on
        // any connectivity hiccup, and the server rejects the re-submission
        // with 409 because the profile already exists.
        const status =
          err != null &&
          typeof err === "object" &&
          "response" in err &&
          err.response != null &&
          typeof err.response === "object" &&
          "status" in err.response
            ? (err.response as { status: number }).status
            : undefined;
        if (status === 401 || status === 403) {
          clearProfile();
        }
      } finally {
        setIsProfileLoading(false);
      }
    };

    if (!isRehydrating) {
      void loadProfile();
    }
  }, [
    clearProfile,
    isAuthenticated,
    isRehydrating,
    refreshToken,
    setProfile,
    token,
  ]);

  useEffect(() => {
    if (isRehydrating) {
      return;
    }

    if (!isAuthenticated || !token || !refreshToken) {
      if (pathname !== "/login" && pathname !== "/register") {
        router.replace("/login");
      }
      return;
    }

    if (isProfileLoading) {
      return;
    }

    const isAuthPath =
      pathname === "/login" ||
      pathname === "/register" ||
      pathname === "/onboarding" ||
      pathname === "/(auth)/onboarding";

    if (profile?.isOnboardingComplete) {
      if (isAuthPath) {
        router.replace("/(tabs)/dashboard");
      }
      return;
    }

    if (pathname !== "/onboarding" && pathname !== "/(auth)/onboarding") {
      router.replace("/(auth)/onboarding");
    }
  }, [
    isAuthenticated,
    isProfileLoading,
    isRehydrating,
    pathname,
    profile,
    refreshToken,
    token,
  ]);

  const appTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      primary: COLORS.primary,
      background: COLORS.background,
      card: COLORS.surface,
      text: COLORS.textPrimary,
      border: COLORS.border,
      notification: COLORS.accent,
    },
  };

  if (isRehydrating || (isAuthenticated && isProfileLoading)) {
    return (
      <GestureHandlerRootView style={styles.root}>
        <View style={styles.loadingContainer}>
          <StatusBar style="light" backgroundColor={COLORS.background} />
          <SkeletonCard lines={4} />
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider value={appTheme}>
            <StatusBar style="light" backgroundColor={COLORS.background} />
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: COLORS.surface },
                headerTintColor: COLORS.textPrimary,
                contentStyle: { backgroundColor: COLORS.background },
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            </Stack>
            <RootOverlays />
          </ThemeProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default RootLayout;
