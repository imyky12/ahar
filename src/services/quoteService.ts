import { API_ROUTES } from "../constants";
import type { DailyQuoteResponse } from "../types";
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

export const getTodayQuote = async (): Promise<DailyQuoteResponse> => {
  const response = await authClient.get<ApiResponse<DailyQuoteResponse>>(
    API_ROUTES.quotes.today,
  );

  return getData(response);
};
