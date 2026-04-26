import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "../constants";
import * as progressService from "../services/progressService";

export const useProgress = () => {
  const queryClient = useQueryClient();

  const statsQuery = useQuery({
    queryKey: QUERY_KEYS.progress.stats,
    queryFn: () => progressService.getProgressStats(),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const historyQuery = useQuery({
    queryKey: QUERY_KEYS.progress.history,
    queryFn: () => progressService.getProgressHistory(),
    staleTime: 30_000,
  });

  const checkinMutation = useMutation({
    mutationFn: (weight: number) =>
      progressService.submitWeeklyCheckin({ weight }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.progress.stats,
      });
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.progress.history,
      });
    },
  });

  const addWeightMutation = useMutation({
    mutationFn: progressService.addWeightLog,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.progress.stats,
      });
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.progress.history,
      });
    },
  });

  const markBadgesSeenMutation = useMutation({
    mutationFn: () => progressService.markBadgesSeen(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.progress.stats,
      });
    },
  });

  const refresh = async (): Promise<void> => {
    await Promise.all([statsQuery.refetch(), historyQuery.refetch()]);
  };

  return useMemo(
    () => ({
      stats: statsQuery.data ?? null,
      history: historyQuery.data ?? null,
      isLoading: statsQuery.isLoading || historyQuery.isLoading,
      isRefetching: statsQuery.isRefetching || historyQuery.isRefetching,
      submitCheckin: async (weight: number) => {
        await checkinMutation.mutateAsync(weight);
      },
      addWeightLog: addWeightMutation.mutateAsync,
      markBadgesSeen: markBadgesSeenMutation.mutateAsync,
      refresh,
      isSubmittingCheckin: checkinMutation.isPending,
    }),
    [
      addWeightMutation.mutateAsync,
      checkinMutation.isPending,
      checkinMutation.mutateAsync,
      historyQuery.data,
      historyQuery.isLoading,
      historyQuery.isRefetching,
      markBadgesSeenMutation.mutateAsync,
      statsQuery.data,
      statsQuery.isLoading,
      statsQuery.isRefetching,
    ],
  );
};

export default useProgress;
