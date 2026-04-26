import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { NotificationType, OnboardingProfileInput } from "../types";

interface OnboardingDraft extends Partial<OnboardingProfileInput> {
  femaleTrackCycle?: boolean;
}

interface InAppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

interface UiState {
  isOnboarded: boolean;
  currentDate: string;
  onboardingStep: number;
  onboardingData: OnboardingDraft;
  expoPushToken: string | null;
  unreadNotificationCount: number;
  inAppNotification: InAppNotification | null;
  showEnergyCheckinModal: boolean;
  showSleepCheckinModal: boolean;
  showGymLogModal: boolean;
  showPeriodCheckinModal: boolean;
  setOnboarded: (value: boolean) => void;
  setCurrentDate: (date: string) => void;
  setOnboardingStep: (step: number) => void;
  setOnboardingData: (payload: Partial<OnboardingDraft>) => void;
  resetOnboarding: () => void;
  setExpoPushToken: (token: string | null) => void;
  setUnreadNotificationCount: (count: number) => void;
  incrementUnreadNotificationCount: () => void;
  setInAppNotification: (notification: InAppNotification | null) => void;
  setShowEnergyCheckinModal: (visible: boolean) => void;
  setShowSleepCheckinModal: (visible: boolean) => void;
  setShowGymLogModal: (visible: boolean) => void;
  setShowPeriodCheckinModal: (visible: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      isOnboarded: false,
      currentDate: new Date().toISOString().slice(0, 10),
      onboardingStep: 1,
      onboardingData: {},
      expoPushToken: null,
      unreadNotificationCount: 0,
      inAppNotification: null,
      showEnergyCheckinModal: false,
      showSleepCheckinModal: false,
      showGymLogModal: false,
      showPeriodCheckinModal: false,
      setOnboarded: (value) => set({ isOnboarded: value }),
      setCurrentDate: (date) => set({ currentDate: date }),
      setOnboardingStep: (step) => set({ onboardingStep: Math.max(1, step) }),
      setOnboardingData: (payload) =>
        set((state) => ({
          onboardingData: {
            ...state.onboardingData,
            ...payload,
          },
        })),
      resetOnboarding: () =>
        set({
          onboardingStep: 1,
          onboardingData: {},
        }),
      setExpoPushToken: (token) => set({ expoPushToken: token }),
      setUnreadNotificationCount: (count) =>
        set({ unreadNotificationCount: Math.max(0, count) }),
      incrementUnreadNotificationCount: () =>
        set((state) => ({
          unreadNotificationCount: state.unreadNotificationCount + 1,
        })),
      setInAppNotification: (notification) =>
        set({ inAppNotification: notification }),
      setShowEnergyCheckinModal: (visible) =>
        set({ showEnergyCheckinModal: visible }),
      setShowSleepCheckinModal: (visible) =>
        set({ showSleepCheckinModal: visible }),
      setShowGymLogModal: (visible) => set({ showGymLogModal: visible }),
      setShowPeriodCheckinModal: (visible) =>
        set({ showPeriodCheckinModal: visible }),
    }),
    {
      name: "ahar-ui-store",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        isOnboarded: state.isOnboarded,
        onboardingStep: state.onboardingStep,
        onboardingData: state.onboardingData,
        expoPushToken: state.expoPushToken,
        unreadNotificationCount: state.unreadNotificationCount,
      }),
    },
  ),
);
