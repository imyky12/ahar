import { useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import { useMemo, useState } from "react";

import { QUERY_KEYS } from "../constants";
import { useAuthStore, useProfileStore } from "../stores";
import * as authService from "../services/authService";

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong";
};

export const useAuth = () => {
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setAuth = useAuthStore((state) => state.setAuth);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const clearProfile = useProfileStore((state) => state.clearProfile);

  const profile = useProfileStore((state) => state.profile);

  const loginMutation = useMutation({
    mutationKey: QUERY_KEYS.auth.session,
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authService.login(email, password),
  });

  const registerMutation = useMutation({
    mutationKey: QUERY_KEYS.auth.session,
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authService.register(email, password),
  });

  const logoutMutation = useMutation({
    mutationFn: () => authService.logout(),
  });

  const login = async (email: string, password: string): Promise<void> => {
    setError(null);

    try {
      const data = await loginMutation.mutateAsync({ email, password });
      setAuth({
        user: data.user,
        token: data.accessToken,
        refreshToken: data.refreshToken,
      });

      // Don't route here — _layout.tsx will redirect correctly once
      // getProfile() resolves. Routing based on stale in-memory profile
      // causes a flash to onboarding on cold start even for existing users.
    } catch (nextError) {
      setError(getErrorMessage(nextError));
      throw nextError;
    }
  };

  const register = async (email: string, password: string): Promise<void> => {
    setError(null);

    try {
      const data = await registerMutation.mutateAsync({ email, password });
      setAuth({
        user: data.user,
        token: data.accessToken,
        refreshToken: data.refreshToken,
      });

      router.replace("/(auth)/onboarding");
    } catch (nextError) {
      setError(getErrorMessage(nextError));
      throw nextError;
    }
  };

  const logout = async (): Promise<void> => {
    setError(null);

    try {
      await logoutMutation.mutateAsync();
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      clearAuth();
      clearProfile();
      router.replace("/login");
    }
  };

  const isLoading = useMemo(
    () =>
      loginMutation.isPending ||
      registerMutation.isPending ||
      logoutMutation.isPending,
    [
      loginMutation.isPending,
      logoutMutation.isPending,
      registerMutation.isPending,
    ],
  );

  return {
    login,
    register,
    logout,
    isAuthenticated,
    isLoading,
    error,
  };
};

export default useAuth;
