import { authClient } from "./authService";
import { API_ROUTES } from "../constants";
import type { DietPlan, FoodItem, PrepTask } from "../types";

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface PlanPayload {
  plan: DietPlan;
  prepTasks: PrepTask[];
  groceryList: DietPlan["groceryList"];
}

const getData = <T>(response: { data: ApiResponse<T> }): T => {
  if (!response.data.data) {
    throw new Error(response.data.error ?? "Invalid server response");
  }

  return response.data.data;
};

const normalizePlan = (payload: PlanPayload): DietPlan => {
  return {
    ...payload.plan,
    prepTasks: payload.prepTasks ?? payload.plan.prepTasks,
    groceryList: payload.groceryList ?? payload.plan.groceryList,
  };
};

export const getTodaysPlan = async (): Promise<DietPlan> => {
  const response = await authClient.get<ApiResponse<PlanPayload>>(
    API_ROUTES.plans.today,
  );

  return normalizePlan(getData(response));
};

export const getTomorrowsPlan = async (): Promise<DietPlan> => {
  const response = await authClient.get<ApiResponse<PlanPayload>>(
    API_ROUTES.plans.tomorrow,
  );

  return normalizePlan(getData(response));
};

export const getPlanByDate = async (date: string): Promise<DietPlan> => {
  const response = await authClient.get<ApiResponse<PlanPayload>>(
    API_ROUTES.plans.byDate(date),
  );

  return normalizePlan(getData(response));
};

export const triggerManualGeneration = async (): Promise<DietPlan> => {
  const response = await authClient.post<ApiResponse<{ plan: DietPlan }>>(
    API_ROUTES.plans.generate,
  );

  return getData(response).plan;
};

export const updatePrepTask = async (
  taskId: string,
  isDone: boolean,
): Promise<PrepTask> => {
  const response = await authClient.put<ApiResponse<{ task: PrepTask }>>(
    API_ROUTES.plans.prepTask,
    {
      taskId,
      isDone,
    },
  );

  return getData(response).task;
};

export const getAlternatives = async (
  mealId: string,
  planDate: string,
  reason: "not_available" | "not_eaten" | "disliked",
): Promise<FoodItem[][]> => {
  const response = await authClient.post<
    ApiResponse<{ alternatives: FoodItem[][] }>
  >(API_ROUTES.plans.alternatives, {
    mealId,
    planDate,
    reason,
  });

  return getData(response).alternatives;
};
