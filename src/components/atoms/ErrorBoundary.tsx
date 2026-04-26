import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { type ReactNode } from "react";
import { Linking, StyleSheet, View } from "react-native";

import { API_ROUTES, COLORS, SPACING } from "../../constants";
import { authClient } from "../../services/authService";
import { AharButton } from "./AharButton";
import { AharText } from "./AharText";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, info: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  public state: ErrorBoundaryState = { hasError: false, error: null };

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error(error, info);
    this.setState({ hasError: true, error });
    this.props.onError?.(error, info);

    void authClient
      .post(API_ROUTES.logsClient.clientError, {
        error: error.message,
        stack: error.stack,
      })
      .catch(() => undefined);
  }

  private reset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  private goDashboard = (): void => {
    router.replace("/(tabs)/dashboard");
    void Linking.openURL("ahar:///(tabs)/dashboard").catch(() => undefined);
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback;
    }

    return (
      <View style={styles.root}>
        <Ionicons name="warning-outline" size={48} color={COLORS.warning} />
        <AharText variant="h2" weight="bold">
          Something went wrong
        </AharText>
        <AharText variant="caption" color={COLORS.textSecondary}>
          {this.state.error?.message ?? "Unknown error"}
        </AharText>
        <View style={styles.actions}>
          <AharButton label="Try again" onPress={this.reset} />
          <AharButton
            label="Go to dashboard"
            variant="ghost"
            onPress={this.goDashboard}
          />
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
    padding: SPACING.xxl,
    gap: SPACING.md,
  },
  actions: {
    marginTop: SPACING.sm,
    gap: SPACING.sm,
    width: "100%",
  },
});

export default ErrorBoundary;
