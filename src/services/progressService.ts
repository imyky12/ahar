import { API_ROUTES } from "../constants";
import type { ProgressStats, WeightLog, WeeklyCheckin } from "../types";
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

export const submitWeeklyCheckin = async (payload: {
  weight: number;
  weekStart?: string;
  weekEnd?: string;
}): Promise<{ status: string; message: string }> => {
  const response = await authClient.post<
    ApiResponse<{ status: string; message: string }>
  >(API_ROUTES.progress.checkin, payload);

  return getData(response);
};

export const getWeeklySummary = async (params?: {
  weekStart?: string;
  weekEnd?: string;
  date?: string;
}): Promise<{ summary: WeeklyCheckin | null; status: string }> => {
  const response = await authClient.get<
    ApiResponse<{ summary: WeeklyCheckin | null; status: string }>
  >(API_ROUTES.progress.weeklySummary, {
    params,
  });

  return getData(response);
};

export const getProgressStats = async (): Promise<ProgressStats> => {
  const response = await authClient.get<ApiResponse<ProgressStats>>(
    API_ROUTES.progress.stats,
  );

  return getData(response);
};

export const getProgressHistory = async (): Promise<{
  weeklyCheckins: WeeklyCheckin[];
  weightLogs: WeightLog[];
}> => {
  const response = await authClient.get<
    ApiResponse<{ weeklyCheckins: WeeklyCheckin[]; weightLogs: WeightLog[] }>
  >(API_ROUTES.progress.history);

  return getData(response);
};

export const addWeightLog = async (payload: {
  date: string;
  weightKg: number;
  bodyFatPercent?: number;
  muscleMassKg?: number;
  notes?: string;
}): Promise<WeightLog> => {
  const response = await authClient.post<ApiResponse<{ weightLog: WeightLog }>>(
    API_ROUTES.progress.weight,
    payload,
  );

  return getData(response).weightLog;
};

export const markBadgesSeen = async (): Promise<number> => {
  const response = await authClient.post<ApiResponse<{ updated: number }>>(
    API_ROUTES.progress.badgesSeen,
  );

  return getData(response).updated;
};
