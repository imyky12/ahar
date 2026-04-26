import { useQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "../constants";
import { getLeaderboard } from "../services/leaderboardService";

export const useLeaderboard = () => {
  const query = useQuery({
    queryKey: QUERY_KEYS.leaderboard.list,
    queryFn: () => getLeaderboard(30),
    staleTime: 60_000,
  });

  return {
    leaderboard: query.data ?? null,
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    refetch: query.refetch,
    error: query.error instanceof Error ? query.error.message : null,
  };
};

export default useLeaderboard;
