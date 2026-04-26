import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "../constants";
import * as logsService from "../services/logsService";
import type { DailyLog, DailyStats, FoodItem } from "../types";
import { addToQueue, offlineManager } from "../utils";

const todayDate = (): string => new Date().toISOString().slice(0, 10);

const cloneDailyLog = (dailyLog: DailyLog | null): DailyLog | null => {
  if (!dailyLog) {
    return null;
  }

  return {
    ...dailyLog,
    waterLogs: [...dailyLog.waterLogs],
    mealLogs: [...dailyLog.mealLogs],
    totalMacrosConsumed: { ...dailyLog.totalMacrosConsumed },
  };
};

export const useDailyLog = () => {
  const queryClient = useQueryClient();
  const date = todayDate();

  const dailyLogQuery = useQuery({
    queryKey: QUERY_KEYS.logs.daily(date),
    queryFn: () => logsService.getDailyLog(date),
    staleTime: 30_000,
  });

  const statsQuery = useQuery({
    queryKey: QUERY_KEYS.logs.stats(date),
    queryFn: () => logsService.getDailyStats(date),
    staleTime: 30_000,
  });

  const invalidateStats = async (): Promise<void> => {
    await queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.logs.stats(date),
    });
  };

  const logEnergyMutation = useMutation({
    mutationFn: (level: number) =>
      offlineManager.withFallback(
        () => logsService.logEnergy(date, level),
        async () => {
          await addToQueue({
            id: `${Date.now()}_energy`,
            endpoint: "/logs/energy",
            method: "POST",
            body: { date, level },
            timestamp: Date.now(),
            retryCount: 0,
          });
          const existing = queryClient.getQueryData<DailyLog>(
            QUERY_KEYS.logs.daily(date),
          );
          return (
            existing ?? {
              userId: "",
              date,
              waterIntakeMl: 0,
              waterLogs: [],
              mealLogs: [],
              totalMacrosConsumed: {
                protein: 0,
                carbs: 0,
                fat: 0,
                calories: 0,
              },
              macroCompliancePercent: 0,
              energyLevel: level,
            }
          );
        },
      ),
    onMutate: async (level) => {
      await queryClient.cancelQueries({
        queryKey: QUERY_KEYS.logs.daily(date),
      });
      const previous = queryClient.getQueryData<DailyLog>(
        QUERY_KEYS.logs.daily(date),
      );

      if (previous) {
        queryClient.setQueryData<DailyLog>(QUERY_KEYS.logs.daily(date), {
          ...previous,
          energyLevel: level,
        });
      }

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(QUERY_KEYS.logs.daily(date), context.previous);
      }
    },
    onSuccess: (dailyLog) => {
      queryClient.setQueryData(QUERY_KEYS.logs.daily(date), dailyLog);
    },
    onSettled: async () => {
      await invalidateStats();
    },
  });

  const logSleepMutation = useMutation({
    mutationFn: ({ quality, hours }: { quality: number; hours: number }) =>
      offlineManager.withFallback(
        () => logsService.logSleep(date, quality, hours),
        async () => {
          await addToQueue({
            id: `${Date.now()}_sleep`,
            endpoint: "/logs/sleep",
            method: "POST",
            body: { date, quality, hoursSlept: hours },
            timestamp: Date.now(),
            retryCount: 0,
          });
          const existing = queryClient.getQueryData<DailyLog>(
            QUERY_KEYS.logs.daily(date),
          );
          return (
            existing ?? {
              userId: "",
              date,
              waterIntakeMl: 0,
              waterLogs: [],
              mealLogs: [],
              totalMacrosConsumed: {
                protein: 0,
                carbs: 0,
                fat: 0,
                calories: 0,
              },
              macroCompliancePercent: 0,
              sleepQuality: quality,
              hoursSlept: hours,
            }
          );
        },
      ),
    onMutate: async ({ quality, hours }) => {
      await queryClient.cancelQueries({
        queryKey: QUERY_KEYS.logs.daily(date),
      });
      const previous = queryClient.getQueryData<DailyLog>(
        QUERY_KEYS.logs.daily(date),
      );

      if (previous) {
        queryClient.setQueryData<DailyLog>(QUERY_KEYS.logs.daily(date), {
          ...previous,
          sleepQuality: quality,
          hoursSlept: hours,
        });
      }

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(QUERY_KEYS.logs.daily(date), context.previous);
      }
    },
    onSuccess: (dailyLog) => {
      queryClient.setQueryData(QUERY_KEYS.logs.daily(date), dailyLog);
    },
    onSettled: async () => {
      await invalidateStats();
    },
  });

  const logWaterMutation = useMutation({
    mutationFn: (amountMl: number) =>
      offlineManager.withFallback(
        () => logsService.logWater(date, amountMl),
        async () => {
          await addToQueue({
            id: `${Date.now()}_water`,
            endpoint: "/logs/water",
            method: "POST",
            body: { date, amountMl },
            timestamp: Date.now(),
            retryCount: 0,
          });
          const existing = queryClient.getQueryData<DailyLog>(
            QUERY_KEYS.logs.daily(date),
          );
          const consumed = (existing?.waterIntakeMl ?? 0) + amountMl;
          return {
            waterIntakeMl: consumed,
            hydrationGoalMl: 0,
            percentComplete: 0,
          };
        },
      ),
    onMutate: async (amountMl) => {
      await queryClient.cancelQueries({
        queryKey: QUERY_KEYS.logs.daily(date),
      });
      const previous = queryClient.getQueryData<DailyLog>(
        QUERY_KEYS.logs.daily(date),
      );

      if (previous) {
        queryClient.setQueryData<DailyLog>(QUERY_KEYS.logs.daily(date), {
          ...previous,
          waterIntakeMl: previous.waterIntakeMl + amountMl,
          waterLogs: [
            ...previous.waterLogs,
            { amount: amountMl, loggedAt: new Date() },
          ],
        });
      }

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(QUERY_KEYS.logs.daily(date), context.previous);
      }
    },
    onSuccess: (_response) => {
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.logs.daily(date),
      });
    },
    onSettled: async () => {
      await invalidateStats();
    },
  });

  const logMealMutation = useMutation({
    mutationFn: ({
      mealId,
      planId,
      status,
      alternativeItems,
    }: {
      mealId: string;
      planId: string;
      status: "done" | "skipped" | "alternative";
      alternativeItems?: FoodItem[];
    }) =>
      offlineManager.withFallback(
        () =>
          logsService.logMeal({
            date,
            mealId,
            planId,
            status,
            alternativeItems,
          }),
        async () => {
          await addToQueue({
            id: `${Date.now()}_meal`,
            endpoint: "/logs/meal",
            method: "POST",
            body: { date, mealId, planId, status, alternativeItems },
            timestamp: Date.now(),
            retryCount: 0,
          });

          const existing = queryClient.getQueryData<DailyLog>(
            QUERY_KEYS.logs.daily(date),
          );

          return {
            dailyLog: existing ?? {
              userId: "",
              date,
              waterIntakeMl: 0,
              waterLogs: [],
              mealLogs: [],
              totalMacrosConsumed: {
                protein: 0,
                carbs: 0,
                fat: 0,
                calories: 0,
              },
              macroCompliancePercent: 0,
            },
            macroSummary: {
              consumed: existing?.totalMacrosConsumed ?? {
                protein: 0,
                carbs: 0,
                fat: 0,
                calories: 0,
              },
              target: existing?.totalMacrosConsumed ?? {
                protein: 0,
                carbs: 0,
                fat: 0,
                calories: 0,
              },
              percentComplete: 0,
              deficit: existing?.totalMacrosConsumed ?? {
                protein: 0,
                carbs: 0,
                fat: 0,
                calories: 0,
              },
            },
          };
        },
      ),
    onMutate: async ({ mealId, planId, status, alternativeItems }) => {
      await queryClient.cancelQueries({
        queryKey: QUERY_KEYS.logs.daily(date),
      });
      const previous = queryClient.getQueryData<DailyLog>(
        QUERY_KEYS.logs.daily(date),
      );
      const snapshot = cloneDailyLog(previous ?? null);

      if (previous) {
        const existing = previous.mealLogs.filter(
          (entry) => entry.mealId !== mealId,
        );
        const optimisticMacros =
          status === "skipped"
            ? { protein: 0, carbs: 0, fat: 0, calories: 0 }
            : status === "alternative"
              ? (alternativeItems ?? []).reduce(
                  (acc, item) => ({
                    protein: acc.protein + item.macros.protein,
                    carbs: acc.carbs + item.macros.carbs,
                    fat: acc.fat + item.macros.fat,
                    calories: acc.calories + item.macros.calories,
                  }),
                  { protein: 0, carbs: 0, fat: 0, calories: 0 },
                )
              : { protein: 0, carbs: 0, fat: 0, calories: 0 };

        queryClient.setQueryData<DailyLog>(QUERY_KEYS.logs.daily(date), {
          ...previous,
          mealLogs: [
            ...existing,
            {
              mealId,
              planId,
              status,
              alternativeItems: alternativeItems ?? [],
              loggedAt: new Date(),
              macrosConsumed: optimisticMacros,
            },
          ],
        });
      }

      return { previous: snapshot };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(QUERY_KEYS.logs.daily(date), context.previous);
      }
    },
    onSuccess: (response) => {
      queryClient.setQueryData(QUERY_KEYS.logs.daily(date), response.dailyLog);
    },
    onSettled: async () => {
      await invalidateStats();
    },
  });

  const skipMutation = useMutation({
    mutationFn: ({
      mealId,
      planId,
      reason,
    }: {
      mealId: string;
      planId: string;
      reason: string;
    }) => logsService.skipMealWithAlternative(date, mealId, planId, reason),
  });

  const refetch = (): void => {
    void dailyLogQuery.refetch();
    void statsQuery.refetch();
  };

  const isLoading = dailyLogQuery.isLoading || statsQuery.isLoading;

  return useMemo(
    () => ({
      dailyLog: dailyLogQuery.data ?? null,
      stats: statsQuery.data ?? null,
      isLoading,
      logEnergy: async (level: number) => {
        await logEnergyMutation.mutateAsync(level);
      },
      logSleep: async (quality: number, hours: number) => {
        await logSleepMutation.mutateAsync({ quality, hours });
      },
      logWater: async (amountMl: number) => {
        await logWaterMutation.mutateAsync(amountMl);
      },
      logMeal: async (
        mealId: string,
        planId: string,
        status: "done" | "skipped" | "alternative",
        alternativeItems?: FoodItem[],
      ) => {
        await logMealMutation.mutateAsync({
          mealId,
          planId,
          status,
          alternativeItems,
        });
      },
      skipWithAlternative: async (
        mealId: string,
        planId: string,
        reason: string,
      ): Promise<FoodItem[][]> => {
        const response = await skipMutation.mutateAsync({
          mealId,
          planId,
          reason,
        });
        return response.alternatives;
      },
      refetch,
    }),
    [
      dailyLogQuery.data,
      isLoading,
      logEnergyMutation,
      logMealMutation,
      logSleepMutation,
      logWaterMutation,
      skipMutation,
      statsQuery.data,
    ],
  );
};

export default useDailyLog;
