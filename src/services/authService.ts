import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";
import { router } from "expo-router";

import { API_BASE_URL, API_ROUTES } from "../constants";
import { useAuthStore } from "../stores";
import type { User } from "../types";

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

export const authClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

const publicClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

authClient.interceptors.request.use((config) => {
  const { token } = useAuthStore.getState();
  if (!token) {
    return config;
  }

  const headers = AxiosHeaders.from(config.headers ?? {});
  headers.set("Authorization", `Bearer ${token}`);

  return {
    ...config,
    headers,
  };
});

authClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiResponse<unknown>>) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const statusCode = error.response?.status;

    if (
      statusCode === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes(API_ROUTES.auth.refresh)
    ) {
      originalRequest._retry = true;

      const {
        refreshToken: storedRefreshToken,
        user,
        clearAuth,
        setAuth,
      } = useAuthStore.getState();

      if (!storedRefreshToken || !user) {
        clearAuth();
        router.replace("/login");
        throw error;
      }

      try {
        const refreshResponse = await publicClient.post<
          ApiResponse<{ accessToken: string }>
        >(API_ROUTES.auth.refresh, { refreshToken: storedRefreshToken });

        const nextAccessToken = refreshResponse.data.data?.accessToken;
        if (!nextAccessToken) {
          throw new Error("Failed to refresh access token");
        }

        setAuth({
          user,
          token: nextAccessToken,
          refreshToken: storedRefreshToken,
        });

        const retryHeaders = AxiosHeaders.from(originalRequest.headers ?? {});
        retryHeaders.set("Authorization", `Bearer ${nextAccessToken}`);

        originalRequest.headers = retryHeaders;
        return authClient.request(originalRequest);
      } catch (refreshError) {
        clearAuth();
        router.replace("/login");
        throw refreshError;
      }
    }

    throw error;
  },
);

const getData = <T>(response: { data: ApiResponse<T> }): T => {
  const { data } = response.data;
  if (!data) {
    throw new Error(response.data.error ?? "Invalid server response");
  }

  return data;
};

export const register = async (
  email: string,
  password: string,
): Promise<AuthResponse> => {
  const response = await authClient.post<ApiResponse<AuthResponse>>(
    API_ROUTES.auth.register,
    {
      email,
      password,
    },
  );

  return getData(response);
};

export const login = async (
  email: string,
  password: string,
): Promise<AuthResponse> => {
  const response = await authClient.post<ApiResponse<AuthResponse>>(
    API_ROUTES.auth.login,
    {
      email,
      password,
    },
  );

  return getData(response);
};

export const refresh = async (
  refreshToken: string,
): Promise<{ accessToken: string }> => {
  const response = await publicClient.post<
    ApiResponse<{ accessToken: string }>
  >(API_ROUTES.auth.refresh, { refreshToken });

  return getData(response);
};

export const logout = async (): Promise<void> => {
  await authClient.post<ApiResponse<{ message: string }>>(
    API_ROUTES.auth.logout,
  );
};

export const getMe = async (): Promise<User> => {
  const response = await authClient.get<ApiResponse<{ user: User }>>(
    API_ROUTES.auth.me,
  );
  const data = getData(response);
  return data.user;
};
