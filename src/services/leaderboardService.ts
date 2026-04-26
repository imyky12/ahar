import { API_ROUTES } from "../constants";
import type { LeaderboardResponse } from "../types";
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

export const getLeaderboard = async (
  limit = 20,
): Promise<LeaderboardResponse> => {
  const response = await authClient.get<ApiResponse<LeaderboardResponse>>(
    API_ROUTES.leaderboard.list,
    { params: { limit } },
  );

  return getData(response);
};
