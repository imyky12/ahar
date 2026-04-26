import { Ionicons } from "@expo/vector-icons";
import { router, Tabs } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NotificationBell } from "../../src/components/molecules";
import { COLORS } from "../../src/constants/theme";

export const TabsLayout = () => {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={({ navigation }) => ({
        headerStyle: { backgroundColor: COLORS.surface },
        headerTintColor: COLORS.textPrimary,
        headerTitleAlign: "center",
        headerLeft: ({ tintColor }) =>
          navigation.canGoBack() ? (
            <Pressable
              onPress={() => navigation.goBack()}
              style={{ paddingHorizontal: 12, paddingVertical: 6 }}
            >
              <Ionicons
                name="chevron-back"
                color={tintColor ?? COLORS.textPrimary}
                size={22}
              />
            </Pressable>
          ) : null,
        sceneStyle: { backgroundColor: COLORS.background },
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          paddingBottom: Math.max(insets.bottom, 4),
          paddingTop: 4,
          height: 50 + Math.max(insets.bottom, 4),
        },
        tabBarActiveTintColor: COLORS.secondary,
        tabBarInactiveTintColor: COLORS.textMuted,
      })}
    >
      <Tabs.Screen
        name="dashboard/index"
        options={{
          title: "Dashboard",
          headerRight: () => (
            <View style={styles.headerRightWrap}>
              <NotificationBell
                onPress={() => router.push("/(tabs)/notifications" as never)}
              />
            </View>
          ),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="plan/index"
        options={{
          title: "Plan",
          headerRight: () => (
            <View style={styles.headerRightWrap}>
              <NotificationBell
                onPress={() => router.push("/(tabs)/notifications" as never)}
              />
            </View>
          ),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="restaurant-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress/index"
        options={{
          title: "Progress",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trending-up-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings/index"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings/diet"
        options={{
          href: null,
          title: "Diet Preferences",
          headerLeft: ({ tintColor }) => (
            <Pressable
              onPress={() => router.push("/(tabs)/settings" as never)}
              style={{ paddingHorizontal: 12, paddingVertical: 6 }}
            >
              <Ionicons
                name="chevron-back"
                color={tintColor ?? COLORS.textPrimary}
                size={22}
              />
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="settings/notifications"
        options={{
          href: null,
          title: "Notification Settings",
          headerLeft: ({ tintColor }) => (
            <Pressable
              onPress={() => router.push("/(tabs)/settings" as never)}
              style={{ paddingHorizontal: 12, paddingVertical: 6 }}
            >
              <Ionicons
                name="chevron-back"
                color={tintColor ?? COLORS.textPrimary}
                size={22}
              />
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="settings/profile"
        options={{
          href: null,
          title: "Profile",
          headerLeft: ({ tintColor }) => (
            <Pressable
              onPress={() => router.push("/(tabs)/settings" as never)}
              style={{ paddingHorizontal: 12, paddingVertical: 6 }}
            >
              <Ionicons
                name="chevron-back"
                color={tintColor ?? COLORS.textPrimary}
                size={22}
              />
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="settings/schedule"
        options={{
          href: null,
          title: "Schedule",
          headerLeft: ({ tintColor }) => (
            <Pressable
              onPress={() => router.push("/(tabs)/settings" as never)}
              style={{ paddingHorizontal: 12, paddingVertical: 6 }}
            >
              <Ionicons
                name="chevron-back"
                color={tintColor ?? COLORS.textPrimary}
                size={22}
              />
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="notifications/index"
        options={{ href: null, title: "Notifications" }}
      />
      <Tabs.Screen
        name="progress/leaderboard"
        options={{
          href: null,
          title: "Leaderboard",
          headerLeft: ({ tintColor }) => (
            <Pressable
              onPress={() => router.push("/(tabs)/progress" as never)}
              style={{ paddingHorizontal: 12, paddingVertical: 6 }}
            >
              <Ionicons
                name="chevron-back"
                color={tintColor ?? COLORS.textPrimary}
                size={22}
              />
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="settings/medicines"
        options={{
          href: null,
          title: "Medicine Reminders",
          headerLeft: ({ tintColor }) => (
            <Pressable
              onPress={() => router.push("/(tabs)/settings" as never)}
              style={{ paddingHorizontal: 12, paddingVertical: 6 }}
            >
              <Ionicons
                name="chevron-back"
                color={tintColor ?? COLORS.textPrimary}
                size={22}
              />
            </Pressable>
          ),
        }}
      />
    </Tabs>
  );
};

export default TabsLayout;

const styles = StyleSheet.create({
  headerRightWrap: {
    paddingTop: 4,
    paddingRight: 16,
  },
});
