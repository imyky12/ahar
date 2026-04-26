import { AxiosError } from "axios";

import { API_ROUTES } from "../constants";
import type { OnboardingProfileInput, UserProfile } from "../types";
import { authClient } from "./authService";

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const getData = <T>(response: { data: ApiResponse<T> }): T => {
  const { data } = response.data;

  if (!data) {
    throw new Error(response.data.error ?? "Invalid server response");
  }

  return data;
};

export const getProfile = async (): Promise<UserProfile | null> => {
  try {
    const response = await authClient.get<
      ApiResponse<{ profile: UserProfile }>
    >(API_ROUTES.profile.detail);

    const data = getData(response);
    return data.profile;
  } catch (error) {
    if (error instanceof AxiosError && error.response?.status === 404) {
      return null;
    }

    throw error;
  }
};

export const createProfile = async (
  payload: OnboardingProfileInput,
): Promise<UserProfile> => {
  const response = await authClient.post<ApiResponse<{ profile: UserProfile }>>(
    API_ROUTES.profile.detail,
    payload,
  );

  const data = getData(response);
  return data.profile;
};

export const updateProfile = async (
  payload: Partial<OnboardingProfileInput>,
): Promise<UserProfile> => {
  const response = await authClient.put<ApiResponse<{ profile: UserProfile }>>(
    API_ROUTES.profile.detail,
    payload,
  );

  const data = getData(response);
  return data.profile;
};

export const uploadProfileAvatar = async (
  dataUri: string,
): Promise<{ avatarUrl: string; profile: UserProfile }> => {
  const response = await authClient.post<
    ApiResponse<{ avatarUrl: string; profile: UserProfile }>
  >(API_ROUTES.profile.avatar, { dataUri });

  return getData(response);
};

export const getUpcomingFestivals = async (): Promise<
  Array<{ name: string; date: string; type: string }>
> => {
  const response = await authClient.get<
    ApiResponse<{
      festivals: Array<{ name: string; date: string; type: string }>;
    }>
  >(API_ROUTES.profile.festivals);

  return getData(response).festivals;
};

export const exportUserData = async (): Promise<Record<string, unknown>> => {
  const response = await authClient.get<
    ApiResponse<{ export: Record<string, unknown> }>
  >(API_ROUTES.profile.exportData);

  return getData(response).export;
};

export const deleteAccount = async (
  confirmEmail: string,
  password: string,
): Promise<{ message: string }> => {
  const response = await authClient.post<ApiResponse<{ message: string }>>(
    API_ROUTES.profile.deleteAccount,
    { confirmEmail, password },
  );

  return getData(response);
};
