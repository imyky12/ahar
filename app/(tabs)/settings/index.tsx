import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  AharButton,
  AharCard,
  AharInput,
  AharText,
  useToast,
} from "../../../src/components/atoms";
import { KeyboardAwareScreen } from "../../../src/components/molecules";
import { COLORS, SPACING } from "../../../src/constants/theme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth, useProfile } from "../../../src/hooks";
import * as profileService from "../../../src/services/profileService";
import { useAuthStore } from "../../../src/stores";

export const SettingsScreen = () => {
  const { profile } = useProfile();
  const { logout } = useAuth();
  const user = useAuthStore((state) => state.user);
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [festivals, setFestivals] = useState<
    Array<{ name: string; date: string; type: string }>
  >([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    void profileService.getUpcomingFestivals().then((data) => {
      setFestivals(data.slice(0, 3));
    });
  }, []);

  const initials = useMemo(() => {
    const name = profile?.name ?? "AHAR";
    return name
      .split(" ")
      .map((part) => part[0]?.toUpperCase() ?? "")
      .slice(0, 2)
      .join("");
  }, [profile?.name]);

  const handleExport = async (): Promise<void> => {
    const data = await profileService.exportUserData();
    await Share.share({
      title: "AHAR Export",
      message: JSON.stringify(data, null, 2),
    });
  };

  const clearCache = (): void => {
    void AsyncStorage.multiRemove(["ahar-offline-plans", "ahar-sync-queue"]).then(() => {
      queryClient.clear();
      showToast("Cache cleared", "success");
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <View style={styles.avatar}>
            {profile?.avatarUrl ? (
              <Image
                source={{ uri: profile.avatarUrl }}
                style={styles.avatarImage}
              />
            ) : (
              <AharText weight="bold">{initials}</AharText>
            )}
          </View>
          <View style={styles.headerText}>
            <AharText variant="h2" weight="bold">
              {profile?.name ?? "AHAR User"}
            </AharText>
            <AharText variant="caption" color={COLORS.textSecondary}>
              {user?.email ?? "No email"}
            </AharText>
            <Pressable
              onPress={() => router.push("/(tabs)/settings/profile" as never)}
            >
              <AharText variant="caption" color={COLORS.secondary}>
                Edit profile
              </AharText>
            </Pressable>
          </View>
        </View>

        <AharText variant="h3" weight="bold">
          Account
        </AharText>
        <AharCard>
          <SettingItem
            icon="person-outline"
            label="Edit profile"
            onPress={() => router.push("/(tabs)/settings/profile" as never)}
          />
          <SettingItem
            icon="notifications-outline"
            label="Notification settings"
            onPress={() =>
              router.push("/(tabs)/settings/notifications" as never)
            }
          />
          <SettingItem
            icon="leaf-outline"
            label="Diet preferences"
            onPress={() => router.push("/(tabs)/settings/diet" as never)}
          />
          <SettingItem
            icon="time-outline"
            label="Schedule"
            onPress={() => router.push("/(tabs)/settings/schedule" as never)}
          />
          <SettingItem
            icon="medkit-outline"
            label="Medicine reminders"
            onPress={() => router.push("/(tabs)/settings/medicines" as never)}
          />
          <SettingItem
            icon="download-outline"
            label="Export my data"
            onPress={() => void handleExport()}
          />
          <SettingItem
            icon="shield-outline"
            label="Privacy policy"
            onPress={() => void Linking.openURL("https://example.com/privacy")}
          />
          <SettingItem
            icon="document-text-outline"
            label="Terms of service"
            onPress={() => void Linking.openURL("https://example.com/terms")}
          />
        </AharCard>

        <AharText variant="h3" weight="bold">
          App
        </AharText>
        <AharCard>
          <SettingItem
            icon="information-circle-outline"
            label="App version"
            value={Constants.expoConfig?.version ?? "1.0.0"}
          />
          <SettingItem
            icon="trash-bin-outline"
            label="Clear cache"
            onPress={clearCache}
          />
          <SettingItem
            icon="star-outline"
            label="Rate AHAR"
            onPress={() => void Linking.openURL("https://example.com/rate")}
          />
        </AharCard>

        <AharText variant="h3" weight="bold">
          Upcoming festivals
        </AharText>
        <AharCard>
          {festivals.length ? (
            festivals.map((festival) => (
              <View
                key={`${festival.name}-${festival.date}`}
                style={styles.festivalRow}
              >
                <View>
                  <AharText weight="medium">{festival.name}</AharText>
                  <AharText variant="caption" color={COLORS.textSecondary}>
                    {festival.date}
                  </AharText>
                </View>
                <AharText
                  variant="caption"
                  color={
                    festival.type === "fast" ? COLORS.warning : COLORS.secondary
                  }
                >
                  {festival.type}
                </AharText>
              </View>
            ))
          ) : (
            <AharText variant="body" color={COLORS.textSecondary}>
              No upcoming festivals in the next 2 weeks
            </AharText>
          )}
        </AharCard>

        <AharText variant="h3" weight="bold" color={COLORS.error}>
          Danger zone
        </AharText>
        <AharCard style={styles.dangerCard}>
          <SettingItem
            icon="trash-outline"
            label="Delete account"
            onPress={() => setShowDeleteModal(true)}
            labelColor={COLORS.error}
          />
        </AharCard>

        {showDeleteModal ? (
          <KeyboardAwareScreen contentContainerStyle={styles.modalWrap}>
            <AharCard>
              <AharText variant="h3" weight="bold" color={COLORS.error}>
                Delete account
              </AharText>
              <AharInput
                label="Confirm email"
                placeholder="you@example.com"
                value={confirmEmail}
                onChangeText={setConfirmEmail}
              />
              <AharInput
                label="Password"
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              <View style={styles.modalActions}>
                <AharButton
                  label="Cancel"
                  variant="secondary"
                  onPress={() => setShowDeleteModal(false)}
                />
                <AharButton
                  label="Delete"
                  variant="danger"
                  onPress={() =>
                    void profileService
                      .deleteAccount(confirmEmail, password)
                      .then(() => logout())
                  }
                />
              </View>
            </AharCard>
          </KeyboardAwareScreen>
        ) : null}

        <AharButton
          label="Logout"
          variant="danger"
          fullWidth
          onPress={() => {
            Alert.alert("Logout", "Are you sure?", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Logout",
                style: "destructive",
                onPress: () => void logout(),
              },
            ]);
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const SettingItem = ({
  icon,
  label,
  value,
  onPress,
  labelColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  labelColor?: string;
}) => (
  <Pressable style={styles.settingRow} onPress={onPress} disabled={!onPress}>
    <View style={styles.settingLeft}>
      <Ionicons
        name={icon}
        size={18}
        color={labelColor ?? COLORS.textSecondary}
      />
      <AharText color={labelColor ?? COLORS.textPrimary}>{label}</AharText>
    </View>
    {value ? (
      <AharText variant="caption" color={COLORS.textSecondary}>
        {value}
      </AharText>
    ) : onPress ? (
      <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
    ) : null}
  </Pressable>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    padding: SPACING.lg,
    gap: SPACING.md,
    paddingBottom: 100,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: SPACING.sm,
  },
  settingLeft: {
    flexDirection: "row",
    gap: SPACING.sm,
    alignItems: "center",
  },
  festivalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SPACING.xs,
  },
  dangerCard: {
    borderColor: COLORS.error,
  },
  modalWrap: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },
});

export default SettingsScreen;
