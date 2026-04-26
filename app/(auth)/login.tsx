import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

import { AharButton, AharInput, AharText } from "../../src/components/atoms";
import { COLORS, SPACING } from "../../src/constants";
import { useAuth } from "../../src/hooks";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const LoginScreen = () => {
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading, error } = useAuth();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormValues): Promise<void> => {
    await login(values.email, values.password);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardContainer}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <AharText variant="h1" weight="bold">
              AHAR
            </AharText>
            <AharText variant="label" color={COLORS.textSecondary}>
              Your AI nourishment companion
            </AharText>
          </View>

          <View style={styles.form}>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <AharInput
                  label="Email"
                  placeholder="you@example.com"
                  value={value}
                  onChangeText={onChange}
                  keyboardType="email-address"
                  leftIcon="mail-outline"
                  error={errors.email?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <AharInput
                  label="Password"
                  placeholder="Enter password"
                  value={value}
                  onChangeText={onChange}
                  secureTextEntry={!showPassword}
                  leftIcon="lock-closed-outline"
                  rightIcon={showPassword ? "eye-off-outline" : "eye-outline"}
                  onRightIconPress={() => setShowPassword((prev) => !prev)}
                  error={errors.password?.message}
                />
              )}
            />

            <AharButton
              label="Sign in"
              loading={isLoading}
              onPress={handleSubmit(onSubmit)}
              fullWidth
            />

            {error ? (
              <AharText variant="caption" color={COLORS.error}>
                {error}
              </AharText>
            ) : null}
          </View>

          <View style={styles.footer}>
            <Link href="/register" style={styles.footerLink}>
              Don&apos;t have an account? Register
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
      {isLoading ? (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.xxxl,
    justifyContent: "space-between",
    backgroundColor: COLORS.background,
  },
  header: {
    alignItems: "center",
    gap: SPACING.sm,
    marginTop: SPACING.xl,
  },
  form: {
    gap: SPACING.lg,
  },
  footer: {
    alignItems: "center",
  },
  footerLink: {
    color: COLORS.secondary,
    fontSize: 14,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 25, 35, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
});

export default LoginScreen;
