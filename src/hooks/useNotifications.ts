import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

import { QUERY_KEYS } from "../constants";
import { useAuthStore, useUiStore } from "../stores";
import type { AppNotification, UserNotificationSettings } from "../types";
import {
  getNotificationHistory,
  getNotificationSettings,
  markNotificationsAsRead,
  registerForPushNotifications,
  registerTokenWithServer,
  setupNotificationChannels,
  updateNotificationSettings,
} from "../services/notificationService";
import { offlineManager } from "../utils";

const defaultSettings: UserNotificationSettings = {
  userId: "",
  notificationsEnabled: true,
  quietHoursStart: "23:00",
  quietHoursEnd: "07:00",
  enabledTypes: {
    plan_ready: true,
    prep_task: true,
    meal_checkin: true,
    water_reminder: true,
    walk_reminder: true,
    skin_care: true,
    supplement: true,
    gym_log: true,
    sleep_checkin: true,
    macro_alert: true,
    weekly_checkin: true,
    energy_checkin: true,
    grocery_ready: true,
    streak_milestone: true,
    daily_quote: true,
    medicine_reminder: true,
  },
  waterReminderIntervalMinutes: 90,
  quotePreference: "motivational",
};

export const useNotifications = () => {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const setExpoPushToken = useUiStore((state) => state.setExpoPushToken);
  const setUnreadNotificationCount = useUiStore(
    (state) => state.setUnreadNotificationCount,
  );

  const historyQuery = useQuery({
    queryKey: QUERY_KEYS.notifications.history,
    queryFn: () => getNotificationHistory(1, 50),
    staleTime: 60_000,
    enabled: isAuthenticated,
  });

  const settingsQuery = useQuery({
    queryKey: QUERY_KEYS.notifications.settings,
    queryFn: () => getNotificationSettings(),
    staleTime: 120_000,
    enabled: isAuthenticated,
  });

  const markAsReadMutation = useMutation({
    mutationFn: (ids: string[]) => markNotificationsAsRead(ids),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.notifications.history,
      });
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (payload: Partial<UserNotificationSettings>) =>
      updateNotificationSettings(payload),
    onSuccess: (settings) => {
      queryClient.setQueryData(QUERY_KEYS.notifications.settings, settings);
    },
  });

  const initialize = async (): Promise<void> => {
    if (!isAuthenticated) {
      return;
    }

    if (!offlineManager.isOnline) {
      return;
    }

    await setupNotificationChannels();

    const token = await registerForPushNotifications();
    if (!token) {
      return;
    }

    setExpoPushToken(token);
    await offlineManager.withFallback(
      () => registerTokenWithServer(token),
      async () => undefined,
    );
  };

  const notifications = historyQuery.data?.notifications ?? [];

  const unreadCount = useMemo(() => {
    return notifications.filter((notification) => !notification.isRead).length;
  }, [notifications]);

  useEffect(() => {
    setUnreadNotificationCount(unreadCount);
  }, [setUnreadNotificationCount, unreadCount]);

  const markAsRead = async (ids: string[]): Promise<void> => {
    await markAsReadMutation.mutateAsync(ids);
  };

  const updateSettings = async (
    payload: Partial<UserNotificationSettings>,
  ): Promise<void> => {
    await updateSettingsMutation.mutateAsync(payload);
  };

  return {
    initialize,
    notificationHistory: notifications as AppNotification[],
    unreadCount,
    markAsRead,
    settings: settingsQuery.data ?? defaultSettings,
    updateSettings,
    isLoading:
      historyQuery.isLoading ||
      settingsQuery.isLoading ||
      markAsReadMutation.isPending ||
      updateSettingsMutation.isPending,
  };
};

export default useNotifications;
