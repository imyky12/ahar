import { API_ROUTES } from "../constants";
import type { MedicineReminder, MedicineReminderInput } from "../types";
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

export const getMedicineReminders = async (): Promise<MedicineReminder[]> => {
  const response = await authClient.get<
    ApiResponse<{ reminders: MedicineReminder[] }>
  >(API_ROUTES.medicines.list);

  return getData(response).reminders;
};

export const createMedicineReminder = async (
  payload: MedicineReminderInput,
): Promise<MedicineReminder> => {
  const response = await authClient.post<
    ApiResponse<{ reminder: MedicineReminder }>
  >(API_ROUTES.medicines.list, payload);

  return getData(response).reminder;
};

export const updateMedicineReminder = async (
  id: string,
  payload: Partial<MedicineReminderInput>,
): Promise<MedicineReminder> => {
  const response = await authClient.put<
    ApiResponse<{ reminder: MedicineReminder }>
  >(API_ROUTES.medicines.update(id), payload);

  return getData(response).reminder;
};

export const deleteMedicineReminder = async (id: string): Promise<void> => {
  await authClient.delete<ApiResponse<{ message: string }>>(
    API_ROUTES.medicines.update(id),
  );
};
