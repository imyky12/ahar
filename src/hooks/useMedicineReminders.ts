import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "../constants";
import {
  createMedicineReminder,
  deleteMedicineReminder,
  getMedicineReminders,
  updateMedicineReminder,
} from "../services/medicineReminderService";
import type { MedicineReminderInput } from "../types";

export const useMedicineReminders = () => {
  const queryClient = useQueryClient();

  const remindersQuery = useQuery({
    queryKey: QUERY_KEYS.medicines.list,
    queryFn: getMedicineReminders,
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: (payload: MedicineReminderInput) =>
      createMedicineReminder(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.medicines.list,
      });
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.notifications.history,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<MedicineReminderInput>;
    }) => updateMedicineReminder(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.medicines.list,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMedicineReminder(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.medicines.list,
      });
    },
  });

  return {
    reminders: remindersQuery.data ?? [],
    isLoading:
      remindersQuery.isLoading ||
      createMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending,
    refetch: remindersQuery.refetch,
    createReminder: createMutation.mutateAsync,
    updateReminder: updateMutation.mutateAsync,
    deleteReminder: deleteMutation.mutateAsync,
  };
};

export default useMedicineReminders;
