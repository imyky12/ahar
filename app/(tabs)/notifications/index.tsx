import { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  AharCard,
  AharText,
  EmptyState,
  useToast,
} from "../../../src/components/atoms";
import { COLORS, SPACING } from "../../../src/constants";
import { useNotifications } from "../../../src/hooks";

const formatDateTime = (value?: Date): string => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString();
};

export const NotificationsScreen = () => {
  const { showToast } = useToast();
  const { notificationHistory, markAsRead, isLoading } = useNotifications();

  const unreadNotifications = useMemo(() => {
    return notificationHistory.filter((item) => !item.isRead);
  }, [notificationHistory]);

  const onNotificationPress = async (id: string, isRead: boolean) => {
    if (isRead) {
      return;
    }

    try {
      await markAsRead([id]);
    } catch {
      showToast("Could not update notification status", "error");
    }
  };

  if (isLoading && !notificationHistory.length) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={COLORS.secondary} />
          <AharText color={COLORS.textSecondary}>
            Loading notifications...
          </AharText>
        </View>
      </SafeAreaView>
    );
  }

  if (!notificationHistory.length) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="notifications-outline"
            title="No notifications yet"
            subtitle="You will see reminders and updates here."
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <AharText variant="caption" color={COLORS.textSecondary}>
          {unreadNotifications.length} unread
        </AharText>

        {notificationHistory.map((notification) => {
          const when = formatDateTime(
            notification.sentAt ?? notification.scheduledFor,
          );

          return (
            <Pressable
              key={notification._id}
              onPress={() =>
                void onNotificationPress(notification._id, notification.isRead)
              }
            >
              <AharCard
                elevated
                style={[
                  styles.notificationCard,
                  !notification.isRead ? styles.unreadCard : null,
                ]}
              >
                <View style={styles.row}>
                  <AharText weight="bold">{notification.title}</AharText>
                  {!notification.isRead ? (
                    <View style={styles.unreadDot} />
                  ) : null}
                </View>
                <AharText color={COLORS.textSecondary}>
                  {notification.body}
                </AharText>
                {when ? (
                  <AharText variant="caption" color={COLORS.textMuted}>
                    {when}
                  </AharText>
                ) : null}
              </AharCard>
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
};

export default NotificationsScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    padding: SPACING.xxl,
    gap: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  loaderWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.md,
  },
  emptyWrap: {
    flex: 1,
    paddingHorizontal: SPACING.xxl,
    justifyContent: "center",
  },
  notificationCard: {
    gap: SPACING.xs,
  },
  unreadCard: {
    borderColor: COLORS.secondary,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: SPACING.sm,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.secondary,
  },
});
