import { API_ROUTES } from "../constants";
import type {
  DailyLog,
  DailyStats,
  FoodItem,
  GymLog,
  GymLogParams,
  WaterResponse,
  WeekHistory,
} from "../types";
import { authClient } from "./authService";

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface LogMealParams {
  date: string;
  mealId: string;
  planId: string;
  status: "done" | "skipped" | "alternative";
  alternativeItems?: FoodItem[];
}

export interface LogMealResponse {
  dailyLog: DailyLog;
  macroSummary: {
    consumed: DailyLog["totalMacrosConsumed"];
    target: DailyLog["totalMacrosConsumed"];
    percentComplete: number;
    deficit: DailyLog["totalMacrosConsumed"];
  };
}

const getData = <T>(response: { data: ApiResponse<T> }): T => {
  if (!response.data.data) {
    throw new Error(response.data.error ?? "Invalid server response");
  }

  return response.data.data;
};

export const logEnergy = async (
  date: string,
  level: number,
  temporaryCondition?: string,
): Promise<DailyLog> => {
  const response = await authClient.post<ApiResponse<{ dailyLog: DailyLog }>>(
    API_ROUTES.logs.energy,
    { date, level, temporaryCondition },
  );

  return getData(response).dailyLog;
};

export const logSleep = async (
  date: string,
  quality: number,
  hoursSlept: number,
): Promise<DailyLog> => {
  const response = await authClient.post<ApiResponse<{ dailyLog: DailyLog }>>(
    API_ROUTES.logs.sleep,
    { date, quality, hoursSlept },
  );

  return getData(response).dailyLog;
};

export const logWater = async (
  date: string,
  amountMl: number,
): Promise<WaterResponse> => {
  const response = await authClient.post<ApiResponse<WaterResponse>>(
    API_ROUTES.logs.water,
    { date, amountMl },
  );

  return getData(response);
};

export const logMeal = async (
  params: LogMealParams,
): Promise<LogMealResponse> => {
  const response = await authClient.post<ApiResponse<LogMealResponse>>(
    API_ROUTES.logs.meal,
    params,
  );

  return getData(response);
};

export const skipMealWithAlternative = async (
  date: string,
  mealId: string,
  planId: string,
  reason: string,
): Promise<{ alternatives: FoodItem[][] }> => {
  const response = await authClient.post<
    ApiResponse<{ alternatives: FoodItem[][] }>
  >(API_ROUTES.logs.mealSkip, {
    date,
    mealId,
    planId,
    reason,
  });

  return getData(response);
};

export const getDailyLog = async (date: string): Promise<DailyLog> => {
  const response = await authClient.get<ApiResponse<{ dailyLog: DailyLog }>>(
    API_ROUTES.logs.daily,
    {
      params: { date },
    },
  );

  return getData(response).dailyLog;
};

export const getDailyStats = async (date: string): Promise<DailyStats> => {
  const response = await authClient.get<ApiResponse<DailyStats>>(
    API_ROUTES.logs.stats,
    {
      params: { date },
    },
  );

  return getData(response);
};

export const logGym = async (params: GymLogParams): Promise<GymLog> => {
  const response = await authClient.post<ApiResponse<{ gymLog: GymLog }>>(
    API_ROUTES.logs.gym,
    params,
  );

  return getData(response).gymLog;
};

export const getGymHistory = async (
  limit: number,
  offset: number,
): Promise<GymLog[]> => {
  const response = await authClient.get<ApiResponse<{ logs: GymLog[] }>>(
    API_ROUTES.logs.gymHistory,
    {
      params: { limit, offset },
    },
  );

  return getData(response).logs;
};

export const getWeekHistory = async (): Promise<WeekHistory> => {
  const response = await authClient.get<ApiResponse<WeekHistory>>(
    API_ROUTES.logs.week,
  );

  return getData(response);
};
