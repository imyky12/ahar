import { create } from "zustand";

import type { UserProfile } from "@/types";

interface ProfileState {
  profile: UserProfile | null;
  setProfile: (profile: UserProfile) => void;
  updateProfile: (profile: Partial<UserProfile>) => void;
  clearProfile: () => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
  updateProfile: (profile) =>
    set((state) => ({
      profile: state.profile ? { ...state.profile, ...profile } : state.profile,
    })),
  clearProfile: () => set({ profile: null }),
}));
