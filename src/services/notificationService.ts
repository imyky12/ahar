import * as Notifications from "expo-notifications";
import type { Router } from "expo-router";
import Constants from "expo-constants";
import { Platform, Alert } from "react-native";

import { API_ROUTES } from "../constants";
import { useUiStore } from "../stores";
import type { AppNotification, UserNotificationSettings } from "../types";
import { authClient } from "./authService";

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const getData = <T>(response: { data: ApiResponse<T> }): T => {
  if (!response.data.data) {
    throw new Error(response.data.error ?? "Invalid server response");
  }

  return response.data.data;
};

const defaultSettings = (userId = ""): UserNotificationSettings => ({
  userId,
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
});

export const registerForPushNotifications = async (): Promise<
  string | null
> => {
  try {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const permissionResponse = await Notifications.requestPermissionsAsync();
      finalStatus = permissionResponse.status;
    }

    if (finalStatus !== "granted") {
      Alert.alert(
        "Notifications are disabled",
        "AHAR reminders help you stay consistent with meals, water, and recovery.",
      );
      return null;
    }

    const projectId: string | undefined =
      Constants.expoConfig?.extra?.eas?.projectId;
    const token = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    return token.data;
  } catch {
    return null;
  }
};

export const setupNotificationChannels = async (): Promise<void> => {
  try {
    if (Platform.OS !== "android") {
      return;
    }

    await Notifications.setNotificationChannelAsync("ahar-gentle", {
      name: "Wellness Tips",
      importance: Notifications.AndroidImportance.LOW,
      sound: "gentle.wav",
      vibrationPattern: [0, 250],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });

    await Notifications.setNotificationChannelAsync("ahar-chime", {
      name: "Meal Check-ins",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "chime.wav",
      vibrationPattern: [0, 250, 250, 250],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });

    await Notifications.setNotificationChannelAsync("ahar-alert", {
      name: "Important Alerts",
      importance: Notifications.AndroidImportance.MAX,
      sound: "alert.wav",
      vibrationPattern: [0, 500, 250, 500],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });

    await Notifications.setNotificationChannelAsync("ahar-default", {
      name: "General",
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: "default.wav",
      vibrationPattern: [0, 300],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  } catch {
    // non-blocking
  }
};

const markAsReadNonBlocking = async (id?: string): Promise<void> => {
  if (!id) {
    return;
  }

  try {
    await authClient.put<ApiResponse<unknown>>(API_ROUTES.notifications.read, {
      notificationIds: [id],
    });
  } catch {
    // non-blocking
  }
};

export const handleNotificationResponse = (
  response: Notifications.NotificationResponse,
  navigation: Pick<Router, "push">,
): void => {
  const notification = response.notification;
  const content = notification.request.content;
  const data =
    content.data && typeof content.data === "object"
      ? (content.data as Record<string, unknown>)
      : {};

  const screen = typeof data.screen === "string" ? data.screen : "dashboard";
  const action = typeof data.action === "string" ? data.action : "";

  const ui = useUiStore.getState();

  if (screen === "plan") {
    navigation.push({ pathname: "/(tabs)/plan" });
  } else if (screen === "dashboard" && action === "energy_checkin") {
    ui.setShowEnergyCheckinModal(true);
    navigation.push("/(tabs)/dashboard");
  } else if (screen === "dashboard" && action === "sleep_checkin") {
    ui.setShowSleepCheckinModal(true);
    navigation.push("/(tabs)/dashboard");
  } else if (screen === "dashboard" && action === "gym_log") {
    ui.setShowGymLogModal(true);
    navigation.push("/(tabs)/dashboard");
  } else if (screen === "dashboard" && action === "water") {
    ui.setInAppNotification({
      id: notification.request.identifier,
      type: "water_reminder",
      title: "Hydration reminder 💧",
      body: "Drink a glass of water now.",
      data,
    });
  } else if (screen === "dashboard" && action === "walk") {
    ui.setInAppNotification({
      id: notification.request.identifier,
      type: "walk_reminder",
      title: "Walk reminder 🚶",
      body: "Take a short walk for better energy.",
      data,
    });
  } else if (screen === "dashboard" && action === "tip") {
    ui.setInAppNotification({
      id: notification.request.identifier,
      type: "skin_care",
      title: content.title ?? "Tip",
      body: content.body ?? "",
      data,
    });
  } else if (screen === "dashboard" && action === "quote") {
    ui.setInAppNotification({
      id: notification.request.identifier,
      type: "daily_quote",
      title: content.title ?? "Today's motivation",
      body: content.body ?? "",
      data,
    });
  } else if (action === "medicine_reminder") {
    ui.setInAppNotification({
      id: notification.request.identifier,
      type: "medicine_reminder",
      title: content.title ?? "Medicine reminder",
      body: content.body ?? "",
      data,
    });
    navigation.push("/(tabs)/settings/medicines");
  }

  void markAsReadNonBlocking(notification.request.identifier);
};

export const setupNotificationHandlers = (
  navigation: Pick<Router, "push">,
): (() => void) => {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  const receivedSub = Notifications.addNotificationReceivedListener((event) => {
    const content = event.request.content;
    const store = useUiStore.getState();
    store.incrementUnreadNotificationCount();

    const data =
      content.data && typeof content.data === "object"
        ? (content.data as Record<string, unknown>)
        : {};

    const type = typeof data.type === "string" ? data.type : "meal_checkin";

    if (type === "meal_checkin") {
      store.setInAppNotification({
        id: event.request.identifier,
        type: type as AppNotification["type"],
        title: content.title ?? "AHAR",
        body: content.body ?? "",
        data,
      });
    }

  });

  const responseSub = Notifications.addNotificationResponseReceivedListener(
    (response) => handleNotificationResponse(response, navigation),
  );

  return () => {
    receivedSub.remove();
    responseSub.remove();
  };
};

export const registerTokenWithServer = async (token: string): Promise<void> => {
  try {
    await authClient.post<ApiResponse<unknown>>(
      API_ROUTES.notifications.token,
      {
        expoPushToken: token,
      },
    );
  } catch {
    // non-blocking
  }
};

export const getNotificationHistory = async (
  page = 1,
  limit = 20,
): Promise<{
  notifications: AppNotification[];
  total: number;
  page: number;
}> => {
  const response = await authClient.get<
    ApiResponse<{
      notifications: AppNotification[];
      total: number;
      page: number;
    }>
  >(API_ROUTES.notifications.history, {
    params: { page, limit },
  });

  return getData(response);
};

export const markNotificationsAsRead = async (
  notificationIds: string[],
): Promise<void> => {
  await authClient.put<ApiResponse<unknown>>(API_ROUTES.notifications.read, {
    notificationIds,
  });
};

export const getNotificationSettings =
  async (): Promise<UserNotificationSettings> => {
    const response = await authClient.get<
      ApiResponse<{ settings: UserNotificationSettings }>
    >(API_ROUTES.notifications.settings);

    const data = getData(response);
    return data.settings;
  };

export const updateNotificationSettings = async (
  payload: Partial<UserNotificationSettings>,
): Promise<UserNotificationSettings> => {
  const response = await authClient.put<
    ApiResponse<{ settings: UserNotificationSettings }>
  >(API_ROUTES.notifications.settings, payload);

  const data = getData(response);
  return data.settings ?? defaultSettings();
};

export const rescheduleNotifications = async (): Promise<void> => {
  await authClient.post<ApiResponse<unknown>>(
    API_ROUTES.notifications.reschedule,
    {},
  );
};
