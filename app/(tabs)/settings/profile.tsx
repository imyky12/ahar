import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useMemo, useState } from "react";
import { Alert, Image, StyleSheet, View } from "react-native";

import {
  AharButton,
  AharCard,
  AharChip,
  AharDatePicker,
  AharInput,
  AharSlider,
  AharText,
  useToast,
} from "../../../src/components/atoms";
import { KeyboardAwareScreen } from "../../../src/components/molecules";
import { COLORS, SPACING } from "../../../src/constants";
import { useProfile } from "../../../src/hooks";
import { uploadProfileAvatar } from "../../../src/services/profileService";

const genders = ["male", "female", "other"] as const;
const goals = ["lose", "maintain", "gain"] as const;
const activityTypes = ["gym", "home", "run", "walk", "desk", "yoga"] as const;
const gymTimes = ["morning", "evening", "none"] as const;

export const EditProfileScreen = () => {
  const { profile, updateProfileMutation } = useProfile();
  const { showToast } = useToast();

  const [draft, setDraft] = useState(profile);
  const [error, setError] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const bmi = useMemo(() => {
    const weight = draft?.weight ?? 0;
    const height = (draft?.height ?? 1) / 100;
    if (!height) {
      return 0;
    }
    return Number((weight / (height * height)).toFixed(1));
  }, [draft?.height, draft?.weight]);

  const bmiStatus = useMemo(() => {
    if (bmi < 18.5) {
      return { label: "Bad (Underweight)", color: COLORS.error };
    }

    if (bmi <= 24.9) {
      return { label: "Good", color: COLORS.success };
    }

    if (bmi <= 29.9) {
      return { label: "Average", color: COLORS.warning };
    }

    return { label: "Bad (High)", color: COLORS.error };
  }, [bmi]);

  const initials = useMemo(() => {
    return (draft?.name ?? "AH")
      .split(" ")
      .map((part) => part[0]?.toUpperCase() ?? "")
      .slice(0, 2)
      .join("");
  }, [draft?.name]);

  if (!draft) {
    return null;
  }

  const pickFromGallery = async (): Promise<void> => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast("Gallery permission is required", "warning");
      return;
    }

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    const selected = picked.assets?.[0];
    if (picked.canceled || !selected?.base64) {
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const mimeType = selected.mimeType ?? "image/jpeg";
      const dataUri = `data:${mimeType};base64,${selected.base64}`;
      const payload = await uploadProfileAvatar(dataUri);
      setDraft((prev) =>
        prev ? { ...prev, avatarUrl: payload.avatarUrl } : prev,
      );
      showToast("Photo selected and uploaded", "success");
    } catch {
      showToast("Could not upload photo", "error");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const validateAndSave = (): void => {
    // Validate cycle length before showing confirmation
    if (draft.gender === "female" && draft.female?.trackCycle) {
      const cl = draft.female.cycleLength;
      if (!cl || cl < 21 || cl > 35) {
        setError("Cycle length must be between 21 and 35 days.");
        return;
      }
    }

    const cycleChanged =
      JSON.stringify(profile?.female) !== JSON.stringify(draft.female);
    const goalChanged = profile?.goal !== draft.goal;

    const warnings: string[] = [];
    if (goalChanged) {
      warnings.push(`Fitness goal → "${draft.goal}" (macros will be recalculated)`);
    }
    if (cycleChanged && draft.gender === "female" && draft.female?.trackCycle) {
      const d = draft.female.lastPeriodDate;
      const dateStr = d
        ? new Date(d).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })
        : "not set";
      warnings.push(`Cycle tracking — period date: ${dateStr}, cycle: ${draft.female.cycleLength ?? 28} days`);
    }

    const message =
      warnings.length > 0
        ? `The following will be updated:\n\n• ${warnings.join("\n• ")}\n\nSave these changes?`
        : "Save profile changes?";

    Alert.alert("Confirm changes", message, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Save",
        onPress: () => void performSave(),
      },
    ]);
  };

  const performSave = async (): Promise<void> => {
    setError(null);
    try {
      const changed: Record<string, unknown> = {};
      if (profile?.avatarUrl !== draft.avatarUrl) {
        changed.avatarUrl = draft.avatarUrl?.trim() || undefined;
      }
      if (profile?.name !== draft.name) changed.name = draft.name;
      if (profile?.age !== draft.age) changed.age = draft.age;
      if (profile?.gender !== draft.gender) changed.gender = draft.gender;
      if (profile?.weight !== draft.weight) changed.weight = draft.weight;
      if (profile?.height !== draft.height) changed.height = draft.height;
      if (profile?.goal !== draft.goal) changed.goal = draft.goal;
      if (profile?.activityType !== draft.activityType)
        changed.activityType = draft.activityType;
      if (profile?.gymTime !== draft.gymTime) changed.gymTime = draft.gymTime;
      if (JSON.stringify(profile?.schedule) !== JSON.stringify(draft.schedule))
        changed.schedule = draft.schedule;
      if (JSON.stringify(profile?.female) !== JSON.stringify(draft.female))
        changed.female = draft.female;

      await updateProfileMutation.mutateAsync(changed);
      showToast("Profile updated! ✓", "success");
      router.back();
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Update failed",
      );
    }
  };

  return (
    <KeyboardAwareScreen contentContainerStyle={styles.container}>
      <AharCard style={styles.card}>
        <AharText variant="h3" weight="bold">
          Profile picture
        </AharText>
        <AharText variant="caption" color={COLORS.textSecondary}>
          Choose a photo from your gallery. It will be uploaded to Cloudinary
          and saved to your profile.
        </AharText>
        <View style={styles.avatarWrap}>
          {draft.avatarUrl ? (
            <Image source={{ uri: draft.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <AharText variant="h3" weight="bold">
                {initials}
              </AharText>
            </View>
          )}
        </View>
        <AharButton
          label={
            draft.avatarUrl ? "Choose another photo" : "Choose from gallery"
          }
          variant="secondary"
          onPress={() => void pickFromGallery()}
          loading={isUploadingPhoto}
        />
      </AharCard>

      <AharText variant="caption" color={COLORS.textSecondary}>
        Update your profile details so AHAR can keep calories, macros, and meal
        timing personalized.
      </AharText>

      <AharCard style={styles.card}>
        <AharText variant="h3" weight="bold">
          Personal info
        </AharText>
        <AharText variant="caption" color={COLORS.textSecondary}>
          Your age, gender, and body metrics influence energy and nutrition
          calculations.
        </AharText>
        <AharInput
          label="Name"
          placeholder="Name"
          value={draft.name}
          onChangeText={(name) =>
            setDraft((prev) => (prev ? { ...prev, name } : prev))
          }
        />
        <AharInput
          label="Age"
          placeholder="Age"
          keyboardType="number-pad"
          value={String(draft.age)}
          onChangeText={(age) =>
            setDraft((prev) =>
              prev ? { ...prev, age: Number(age || 0) } : prev,
            )
          }
        />
        <View style={styles.rowWrap}>
          {genders.map((gender) => (
            <AharChip
              key={gender}
              label={gender}
              selected={draft.gender === gender}
              onPress={() =>
                setDraft((prev) => (prev ? { ...prev, gender } : prev))
              }
            />
          ))}
        </View>
        <AharText variant="caption" color={COLORS.textSecondary}>
          BMI: {bmi}
        </AharText>
        <AharText variant="caption" color={bmiStatus.color}>
          BMI status: {bmiStatus.label}
        </AharText>
      </AharCard>

      <AharCard style={styles.card}>
        <AharText variant="h3" weight="bold">
          Body metrics
        </AharText>
        <AharText variant="caption" color={COLORS.textSecondary}>
          Keep weight and height current to get accurate macro and hydration
          targets.
        </AharText>
        <AharSlider
          label="Weight"
          value={draft.weight}
          minimumValue={35}
          maximumValue={160}
          onValueChange={(weight) =>
            setDraft((prev) => (prev ? { ...prev, weight } : prev))
          }
          suffix=" kg"
        />
        <AharSlider
          label="Height"
          value={draft.height}
          minimumValue={120}
          maximumValue={220}
          onValueChange={(height) =>
            setDraft((prev) => (prev ? { ...prev, height } : prev))
          }
          suffix=" cm"
        />
        <AharText variant="caption" color={COLORS.textSecondary}>
          Last updated: {new Date().toLocaleDateString()}
        </AharText>
      </AharCard>

      <AharCard style={styles.card}>
        <AharText variant="h3" weight="bold">
          Fitness goal
        </AharText>
        <AharText variant="caption" color={COLORS.textSecondary}>
          Choose your primary goal, activity style, and training time so meals
          align with your routine.
        </AharText>
        <View style={styles.rowWrap}>
          {goals.map((goal) => (
            <AharChip
              key={goal}
              label={goal}
              selected={draft.goal === goal}
              onPress={() =>
                setDraft((prev) => (prev ? { ...prev, goal } : prev))
              }
            />
          ))}
        </View>
        <View style={styles.rowWrap}>
          {activityTypes.map((activityType) => (
            <AharChip
              key={activityType}
              label={activityType}
              selected={draft.activityType === activityType}
              onPress={() =>
                setDraft((prev) => (prev ? { ...prev, activityType } : prev))
              }
            />
          ))}
        </View>
        <View style={styles.rowWrap}>
          {gymTimes.map((gymTime) => (
            <AharChip
              key={gymTime}
              label={gymTime}
              selected={draft.gymTime === gymTime}
              onPress={() =>
                setDraft((prev) => (prev ? { ...prev, gymTime } : prev))
              }
            />
          ))}
        </View>
        <AharCard elevated>
          <AharText variant="caption" color={COLORS.warning}>
            Changing your goal will recalculate your daily macro targets.
          </AharText>
        </AharCard>
      </AharCard>

      {draft.gender === "female" ? (
        <AharCard style={styles.card}>
          <AharText variant="h3" weight="bold">
            Cycle tracking 🌸
          </AharText>
          <AharText variant="caption" color={COLORS.textSecondary}>
            AHAR uses your cycle phase to personalise meal plans — iron-rich foods
            during your period, lighter meals at ovulation, extra carbs in the
            luteal phase.
          </AharText>

          <View style={styles.rowWrap}>
            <AharChip
              label="Track my cycle"
              selected={draft.female?.trackCycle === true}
              onPress={() =>
                setDraft((prev) =>
                  prev
                    ? {
                        ...prev,
                        female: { ...(prev.female ?? { trackCycle: false }), trackCycle: true },
                      }
                    : prev,
                )
              }
            />
            <AharChip
              label="Don't track"
              selected={!draft.female?.trackCycle}
              onPress={() =>
                setDraft((prev) =>
                  prev
                    ? {
                        ...prev,
                        female: { ...(prev.female ?? { trackCycle: false }), trackCycle: false },
                      }
                    : prev,
                )
              }
            />
          </View>

          {draft.female?.trackCycle ? (
            <>
              <AharDatePicker
                label="First day of last period"
                value={
                  draft.female.lastPeriodDate
                    ? new Date(draft.female.lastPeriodDate)
                        .toISOString()
                        .slice(0, 10)
                    : undefined
                }
                onChange={(iso) =>
                  setDraft((prev) =>
                    prev
                      ? {
                          ...prev,
                          female: {
                            ...(prev.female ?? { trackCycle: true }),
                            lastPeriodDate: new Date(`${iso}T00:00:00`),
                          },
                        }
                      : prev,
                  )
                }
              />

              <AharInput
                label="Cycle length (days)"
                placeholder="28"
                keyboardType="number-pad"
                value={String(draft.female.cycleLength ?? 28)}
                onChangeText={(v) =>
                  setDraft((prev) =>
                    prev
                      ? {
                          ...prev,
                          female: {
                            ...(prev.female ?? { trackCycle: true }),
                            cycleLength: parseInt(v, 10) || 28,
                          },
                        }
                      : prev,
                  )
                }
              />
              <AharText variant="caption" color={COLORS.textMuted}>
                Typical cycle is 21–35 days. Most people are 28 days.
              </AharText>
            </>
          ) : null}
        </AharCard>
      ) : null}

      <AharButton
        label="Save changes"
        fullWidth
        size="lg"
        onPress={validateAndSave}
        loading={updateProfileMutation.isPending}
      />
      {error ? <AharText color={COLORS.error}>{error}</AharText> : null}
    </KeyboardAwareScreen>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: SPACING.xxl,
    gap: SPACING.lg,
    paddingBottom: 120,
  },
  card: {
    gap: SPACING.md,
  },
  rowWrap: {
    flexDirection: "row",
    gap: SPACING.xs,
    flexWrap: "wrap",
  },
  avatarWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface2,
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
});

export default EditProfileScreen;
