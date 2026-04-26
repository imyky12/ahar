import { create } from "zustand";

import type { DietPlan, Meal } from "../types";

interface PlanState {
  todaysPlan: DietPlan | null;
  tomorrowsPlan: DietPlan | null;
  offlinePlans: DietPlan[];
  setPlan: (payload: {
    type: "today" | "tomorrow";
    plan: DietPlan | null;
  }) => void;
  updateMealStatus: (payload: {
    planType: "today" | "tomorrow";
    mealId: string;
    status: Meal["status"];
    alternativeTaken?: Meal["alternativeTaken"];
  }) => void;
  updatePrepTask: (payload: {
    planType: "today" | "tomorrow";
    taskId: string;
    isDone: boolean;
  }) => void;
  setOfflinePlans: (plans: DietPlan[]) => void;
}

const patchMeal = (
  plan: DietPlan | null,
  mealId: string,
  status: Meal["status"],
  alternativeTaken?: Meal["alternativeTaken"],
): DietPlan | null => {
  if (!plan) {
    return null;
  }

  return {
    ...plan,
    meals: plan.meals.map((meal) =>
      meal.id === mealId
        ? {
            ...meal,
            status,
            alternativeTaken,
          }
        : meal,
    ),
  };
};

export const usePlanStore = create<PlanState>((set) => ({
  todaysPlan: null,
  tomorrowsPlan: null,
  offlinePlans: [],
  setPlan: ({ type, plan }) =>
    set((state) => {
      const nextOfflinePlans = plan
        ? [
            ...state.offlinePlans.filter(
              (offlinePlan) => offlinePlan.date !== plan.date,
            ),
            plan,
          ]
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 3)
        : state.offlinePlans;

      return type === "today"
        ? { todaysPlan: plan, offlinePlans: nextOfflinePlans }
        : { tomorrowsPlan: plan, offlinePlans: nextOfflinePlans };
    }),
  updateMealStatus: ({ planType, mealId, status, alternativeTaken }) =>
    set((state) => {
      if (planType === "today") {
        return {
          todaysPlan: patchMeal(
            state.todaysPlan,
            mealId,
            status,
            alternativeTaken,
          ),
        };
      }

      return {
        tomorrowsPlan: patchMeal(
          state.tomorrowsPlan,
          mealId,
          status,
          alternativeTaken,
        ),
      };
    }),
  updatePrepTask: ({ planType, taskId, isDone }) =>
    set((state) => {
      const targetPlan =
        planType === "today" ? state.todaysPlan : state.tomorrowsPlan;

      if (!targetPlan) {
        return state;
      }

      const nextPlan = {
        ...targetPlan,
        prepTasks: targetPlan.prepTasks.map((task) =>
          task.id === taskId ? { ...task, isDone } : task,
        ),
      };

      return planType === "today"
        ? { todaysPlan: nextPlan }
        : { tomorrowsPlan: nextPlan };
    }),
  setOfflinePlans: (plans) =>
    set({
      offlinePlans: plans
        .slice()
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 3),
    }),
}));
