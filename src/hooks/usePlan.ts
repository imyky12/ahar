import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { QUERY_KEYS } from "../constants";
import { useAuthStore, usePlanStore } from "../stores";
import type { DietPlan, FoodItem } from "../types";
import {
  cachePlan,
  getAllCachedPlans,
  getCachedPlan,
  offlineManager,
} from "../utils";
import * as planService from "../services/planService";

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return "Failed to load plan";
};

export const usePlan = () => {
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const user = useAuthStore((state) => state.user);
  const todaysPlanStore = usePlanStore((state) => state.todaysPlan);
  const tomorrowsPlanStore = usePlanStore((state) => state.tomorrowsPlan);
  const offlinePlans = usePlanStore((state) => state.offlinePlans);
  const setPlan = usePlanStore((state) => state.setPlan);
  const updatePrepTaskInStore = usePlanStore((state) => state.updatePrepTask);
  const setOfflinePlans = usePlanStore((state) => state.setOfflinePlans);

  const todayQuery = useQuery({
    queryKey: QUERY_KEYS.plans.today,
    queryFn: async () => {
      return offlineManager.withFallback(
        async () => {
          const plan = await planService.getTodaysPlan();
          setPlan({ type: "today", plan });
          await cachePlan(plan);
          return plan;
        },
        async () => {
          if (!user?._id) {
            throw new Error("No cached plan available");
          }

          const date = new Date().toISOString().slice(0, 10);
          const cached = await getCachedPlan(user._id, date);
          if (!cached) {
            throw new Error("No cached plan available");
          }

          return cached;
        },
      );
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
    enabled: Boolean(user?._id),
  });

  const tomorrowQuery = useQuery({
    queryKey: QUERY_KEYS.plans.tomorrow,
    queryFn: async () => {
      return offlineManager.withFallback(
        async () => {
          const plan = await planService.getTomorrowsPlan();
          setPlan({ type: "tomorrow", plan });
          await cachePlan(plan);
          return plan;
        },
        async () => {
          if (!user?._id) {
            throw new Error("No cached plan available");
          }

          const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 10);
          const cached = await getCachedPlan(user._id, tomorrow);
          if (!cached) {
            throw new Error("No cached plan available");
          }

          return cached;
        },
      );
    },
    staleTime: 30 * 60 * 1000,
    retry: 1,
    enabled: Boolean(user?._id),
  });

  const triggerMutation = useMutation({
    mutationFn: () =>
      offlineManager.withFallback(
        () => planService.triggerManualGeneration(),
        async () => {
          throw new Error("Manual generation unavailable offline");
        },
      ),
    onSuccess: async (plan) => {
      setPlan({ type: "tomorrow", plan });
      await cachePlan(plan);
      queryClient.setQueryData(QUERY_KEYS.plans.tomorrow, plan);
    },
  });

  const prepTaskMutation = useMutation({
    mutationFn: ({ taskId, isDone }: { taskId: string; isDone: boolean }) =>
      planService.updatePrepTask(taskId, isDone),
  });

  const alternativesMutation = useMutation({
    mutationFn: ({
      mealId,
      date,
      reason,
    }: {
      mealId: string;
      date: string;
      reason: "not_available" | "not_eaten" | "disliked";
    }) => planService.getAlternatives(mealId, date, reason),
  });

  const ensureOfflineFallback = async (): Promise<void> => {
    if (!user?._id) {
      return;
    }

    const all = await getAllCachedPlans(user._id);
    setOfflinePlans(all);
  };

  const refetchToday = async (): Promise<void> => {
    setError(null);
    try {
      await todayQuery.refetch();
    } catch (nextError) {
      setError(toErrorMessage(nextError));
      await ensureOfflineFallback();
    }
  };

  const triggerGeneration = async (): Promise<void> => {
    setError(null);
    try {
      await triggerMutation.mutateAsync();
    } catch (nextError) {
      setError(toErrorMessage(nextError));
    }
  };

  const updatePrepTask = async (
    taskId: string,
    isDone: boolean,
  ): Promise<void> => {
    setError(null);
    try {
      await prepTaskMutation.mutateAsync({ taskId, isDone });
      const todayHasTask = (todayQuery.data ?? todaysPlanStore)?.prepTasks.some(
        (task) => task.id === taskId,
      );
      const targetKey = todayHasTask
        ? QUERY_KEYS.plans.today
        : QUERY_KEYS.plans.tomorrow;

      queryClient.setQueryData<DietPlan | undefined>(targetKey, (prev) => {
        if (!prev) {
          return prev;
        }

        return {
          ...prev,
          prepTasks: prev.prepTasks.map((task) =>
            task.id === taskId ? { ...task, isDone } : task,
          ),
        };
      });

      updatePrepTaskInStore({
        planType: todayHasTask ? "today" : "tomorrow",
        taskId,
        isDone,
      });
    } catch (nextError) {
      setError(toErrorMessage(nextError));
    }
  };

  const getAlternatives = async (
    mealId: string,
    date: string,
    reason: "not_available" | "not_eaten" | "disliked",
  ): Promise<FoodItem[][]> => {
    setError(null);
    try {
      return await alternativesMutation.mutateAsync({ mealId, date, reason });
    } catch (nextError) {
      setError(toErrorMessage(nextError));
      return [[], [], []];
    }
  };

  const todaysPlan = useMemo(() => {
    const fromQuery = todayQuery.data;
    if (fromQuery) {
      return fromQuery;
    }

    if (todaysPlanStore) {
      return todaysPlanStore;
    }

    if (user?._id) {
      const date = new Date().toISOString().slice(0, 10);
      const fromOffline = offlinePlans.find((plan) => plan.date === date);
      if (fromOffline) {
        return fromOffline;
      }
    }

    return null;
  }, [offlinePlans, todayQuery.data, todaysPlanStore, user?._id]);

  const tomorrowsPlan = useMemo(() => {
    const fromQuery = tomorrowQuery.data;
    if (fromQuery) {
      return fromQuery;
    }

    if (tomorrowsPlanStore) {
      return tomorrowsPlanStore;
    }

    return null;
  }, [tomorrowQuery.data, tomorrowsPlanStore]);

  const hydrateOffline = async (): Promise<void> => {
    if (!user?._id) {
      return;
    }

    const date = new Date().toISOString().slice(0, 10);
    const cached = await getCachedPlan(user._id, date);
    if (cached) {
      setPlan({ type: "today", plan: cached });
    }

    await ensureOfflineFallback();
  };

  useEffect(() => {
    if (todayQuery.isError || tomorrowQuery.isError) {
      void hydrateOffline();
    }
  }, [todayQuery.isError, tomorrowQuery.isError, user?._id]);

  return {
    todaysPlan: todaysPlan as DietPlan | null,
    tomorrowsPlan: tomorrowsPlan as DietPlan | null,
    isLoadingToday: todayQuery.isLoading || todayQuery.isFetching,
    isLoadingTomorrow: tomorrowQuery.isLoading || tomorrowQuery.isFetching,
    refetchToday,
    triggerGeneration,
    updatePrepTask,
    getAlternatives,
    error:
      error ??
      (todayQuery.error
        ? toErrorMessage(todayQuery.error)
        : tomorrowQuery.error
          ? toErrorMessage(tomorrowQuery.error)
          : null),
  };
};

export default usePlan;
