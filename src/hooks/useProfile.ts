import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import { useEffect } from "react";

import { QUERY_KEYS } from "../constants";
import { useAuthStore, useProfileStore, useUiStore } from "../stores";
import type { OnboardingProfileInput, UserProfile } from "../types";
import * as profileService from "../services/profileService";

interface UseProfileResult {
  profile: UserProfile | null;
  isLoading: boolean;
  isFetching: boolean;
  error: string | null;
  refetchProfile: () => Promise<void>;
  createProfileMutation: UseMutationResult<
    UserProfile,
    Error,
    OnboardingProfileInput,
    unknown
  >;
  updateProfileMutation: UseMutationResult<
    UserProfile,
    Error,
    Partial<OnboardingProfileInput>,
    unknown
  >;
}

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return "Failed to load profile";
};

export const useProfile = (): UseProfileResult => {
  const queryClient = useQueryClient();

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const storeProfile = useProfileStore((state) => state.profile);
  const setProfile = useProfileStore((state) => state.setProfile);
  const clearProfile = useProfileStore((state) => state.clearProfile);
  const setOnboarded = useUiStore((state) => state.setOnboarded);

  const query = useQuery({
    queryKey: QUERY_KEYS.profile.detail,
    queryFn: () => profileService.getProfile(),
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (query.data === null && storeProfile) {
      clearProfile();
    }

    if (query.data && (!storeProfile || storeProfile._id !== query.data._id)) {
      setProfile(query.data);
      setOnboarded(Boolean(query.data.isOnboardingComplete));
    }
  }, [clearProfile, query.data, setOnboarded, setProfile, storeProfile]);

  const createProfileMutation = useMutation({
    mutationFn: (payload: OnboardingProfileInput) =>
      profileService.createProfile(payload),
    onSuccess: (data) => {
      setProfile(data);
      setOnboarded(true);
      queryClient.setQueryData(QUERY_KEYS.profile.detail, data);
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: (payload: Partial<OnboardingProfileInput>) =>
      profileService.updateProfile(payload),
    onSuccess: (data) => {
      setProfile(data);
      setOnboarded(Boolean(data.isOnboardingComplete));
      queryClient.setQueryData(QUERY_KEYS.profile.detail, data);
    },
  });

  return {
    profile: query.data ?? storeProfile,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error ? toErrorMessage(query.error) : null,
    refetchProfile: async () => {
      await query.refetch();
    },
    createProfileMutation,
    updateProfileMutation,
  };
};

export default useProfile;
