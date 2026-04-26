import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

import { AharButton, AharInput, AharText } from "../../src/components/atoms";
import { COLORS, SPACING } from "../../src/constants";
import { useAuth } from "../../src/hooks";

const registerSchema = z
  .object({
    email: z.string().email("Enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must include at least one uppercase letter")
      .regex(/[0-9]/, "Password must include at least one number"),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export const RegisterScreen = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { register, isLoading, error } = useAuth();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: RegisterFormValues): Promise<void> => {
    await register(values.email, values.password);
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
              Create your account
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
                  placeholder="Create password"
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

            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, value } }) => (
                <AharInput
                  label="Confirm password"
                  placeholder="Re-enter password"
                  value={value}
                  onChangeText={onChange}
                  secureTextEntry={!showConfirmPassword}
                  leftIcon="lock-closed-outline"
                  rightIcon={
                    showConfirmPassword ? "eye-off-outline" : "eye-outline"
                  }
                  onRightIconPress={() =>
                    setShowConfirmPassword((prev) => !prev)
                  }
                  error={errors.confirmPassword?.message}
                />
              )}
            />

            <AharButton
              label="Create account"
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
            <Link href="/login" style={styles.footerLink}>
              Already have an account? Sign in
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
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
});

export default RegisterScreen;
