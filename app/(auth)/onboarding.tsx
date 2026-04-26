import { zodResolver } from "@hookform/resolvers/zod";
import { City, Country, type ICountry } from "country-state-city";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm, type FieldPath } from "react-hook-form";
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

import {
  AharButton,
  AharChip,
  AharDatePicker,
  AharInput,
  AharProgressBar,
  AharSlider,
  AharText,
  AharTimePicker,
} from "../../src/components/atoms";
import { OnboardingStep } from "../../src/components/molecules";
import {
  BORDER_RADIUS,
  COLORS,
  SPACING,
} from "../../src/constants";
import {
  CHRONIC_CONDITIONS,
  CHRONIC_CONDITION_LABELS,
} from "../../src/constants/chronicConditions";
import { useProfile } from "../../src/hooks";
import { useUiStore } from "../../src/stores";
import type { ChronicCondition, OnboardingProfileInput } from "../../src/types";

const onboardingSchema = z.object({
  name: z.string().min(2, "Enter your name"),
  age: z
    .number()
    .min(13, "Age must be 13+")
    .max(100, "Age must be 100 or less"),
  gender: z.enum(["male", "female", "other"]),
  weight: z
    .number()
    .min(30, "Weight is too low")
    .max(300, "Weight is too high"),
  height: z
    .number()
    .min(100, "Height is too low")
    .max(250, "Height is too high"),
  activityType: z.enum(["gym", "home", "run", "walk", "desk", "yoga"]),
  gymTime: z.enum(["morning", "evening", "none"]),
  goal: z.enum(["lose", "gain", "maintain"]),
  isVeg: z.boolean(),
  allergies: z.array(z.string()),
  chronicConditions: z.array(z.string()),
  fastingStart: z.string().optional(),
  fastingEnd: z.string().optional(),
  wakeTime: z.string().min(1, "Wake-up time is required"),
  sleepTime: z.string().min(1, "Sleep time is required"),
  officeStart: z.string().optional(),
  officeEnd: z.string().optional(),
  gymStart: z.string().optional(),
  gymEnd: z.string().optional(),
  country: z.string().min(1, "Country is required"),
  city: z.string().min(1, "City is required"),
  timezone: z.string().min(1, "Timezone is required"),
  femaleTrackCycle: z.boolean(),
  lastPeriodDate: z.string().optional(),
  cycleLength: z.number().optional(),
});

type OnboardingFormValues = z.infer<typeof onboardingSchema>;

const TOTAL_STEPS = 7;
const ALLERGY_OPTIONS = [
  "Peanuts",
  "Gluten",
  "Soy",
  "Dairy",
  "Tree nuts",
  "No allergies",
] as const;

interface SelectOption {
  label: string;
  value: string;
}

interface SearchSelectModalProps {
  visible: boolean;
  title: string;
  options: SelectOption[];
  selectedValue?: string;
  onClose: () => void;
  onSelect: (value: string) => void;
}

const SearchSelectModal = ({
  visible,
  title,
  options,
  selectedValue,
  onClose,
  onSelect,
}: SearchSelectModalProps) => {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return options;
    }

    return options.filter((option) =>
      option.label.toLowerCase().includes(normalized),
    );
  }, [options, query]);

  useEffect(() => {
    if (!visible) {
      setQuery("");
    }
  }, [visible]);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.selectKeyboardWrap}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.selectBackdrop}>
          <Pressable style={styles.selectBackdropPressable} onPress={onClose} />
          <View style={styles.selectCard}>
            <View style={styles.selectDragHandle} />
            <AharText variant="h3" weight="bold">
              {title}
            </AharText>
            <View style={styles.searchInputWrap}>
              <Ionicons
                name="search-outline"
                size={18}
                color={COLORS.textSecondary}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Search..."
                placeholderTextColor={COLORS.textMuted}
                value={query}
                onChangeText={setQuery}
                selectionColor={COLORS.primary}
              />
            </View>

            <FlatList
              data={filtered}
              keyExtractor={(item) => item.value}
              keyboardShouldPersistTaps="always"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
              style={styles.selectList}
              contentContainerStyle={styles.selectListContent}
              renderItem={({ item }) => {
                const selected = item.value === selectedValue;

                return (
                  <Pressable
                    style={[
                      styles.selectOption,
                      selected ? styles.selectOptionSelected : null,
                    ]}
                    onPress={() => {
                      onSelect(item.value);
                      onClose();
                    }}
                  >
                    <AharText
                      color={
                        selected ? COLORS.textPrimary : COLORS.textSecondary
                      }
                      weight={selected ? "bold" : "medium"}
                    >
                      {item.label}
                    </AharText>
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <AharText variant="caption" color={COLORS.textMuted}>
                  No results found
                </AharText>
              }
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export const OnboardingScreen = () => {
  const {
    createProfileMutation,
    profile,
    isLoading: isProfileLoading,
  } = useProfile();

  const onboardingStep = useUiStore((state) => state.onboardingStep);
  const onboardingData = useUiStore((state) => state.onboardingData);
  const setOnboardingStep = useUiStore((state) => state.setOnboardingStep);
  const setOnboardingData = useUiStore((state) => state.setOnboardingData);
  const resetOnboarding = useUiStore((state) => state.resetOnboarding);
  const setOnboarded = useUiStore((state) => state.setOnboarded);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  const [timezonePickerOpen, setTimezonePickerOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const {
    control,
    watch,
    setValue,
    setError,
    clearErrors,
    getValues,
    trigger,
    formState: { errors },
  } = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      name: onboardingData.name ?? "",
      age: onboardingData.age ?? 25,
      gender: onboardingData.gender ?? "male",
      weight: onboardingData.weight ?? 70,
      height: onboardingData.height ?? 170,
      activityType: onboardingData.activityType ?? "gym",
      gymTime: onboardingData.gymTime ?? "evening",
      goal: onboardingData.goal ?? "maintain",
      isVeg: onboardingData.dietPref?.isVeg ?? true,
      allergies: onboardingData.dietPref?.allergies ?? [],
      chronicConditions: (onboardingData.dietPref?.chronicConditions as string[]) ?? [],
      fastingStart: onboardingData.dietPref?.fastingWindow?.start,
      fastingEnd: onboardingData.dietPref?.fastingWindow?.end,
      wakeTime: onboardingData.schedule?.wakeTime ?? "06:30",
      sleepTime: onboardingData.schedule?.sleepTime ?? "22:30",
      officeStart: onboardingData.schedule?.officeStart,
      officeEnd: onboardingData.schedule?.officeEnd,
      gymStart: onboardingData.schedule?.gymStart,
      gymEnd: onboardingData.schedule?.gymEnd,
      country: onboardingData.location?.country ?? "India",
      city: onboardingData.location?.city ?? "",
      timezone: onboardingData.location?.timezone ?? "Asia/Kolkata",
      femaleTrackCycle: onboardingData.femaleTrackCycle ?? false,
      lastPeriodDate: onboardingData.female?.lastPeriodDate
        ? new Date(onboardingData.female.lastPeriodDate)
            .toISOString()
            .slice(0, 10)
        : undefined,
      cycleLength: onboardingData.female?.cycleLength,
    },
  });

  const gender = watch("gender");
  const showFemaleStep = gender === "female";

  // Step 7 (female cycle) is female-only. Non-female users go 1→6 then submit.
  const effectiveTotalSteps = showFemaleStep ? TOTAL_STEPS : TOTAL_STEPS - 1;
  const effectiveStep = useMemo(() => {
    if (showFemaleStep) {
      return onboardingStep;
    }
    // Non-female: internal step 7 maps to display 6
    return Math.min(onboardingStep, TOTAL_STEPS - 1);
  }, [onboardingStep, showFemaleStep]);
  const [displayStep, setDisplayStep] = useState(effectiveStep);
  const displayStepInitializedRef = useRef(false);

  useEffect(() => {
    if (displayStepInitializedRef.current) {
      return;
    }

    setDisplayStep(effectiveStep);
    displayStepInitializedRef.current = true;
  }, [effectiveStep]);

  const selectedCountry = watch("country");
  const selectedCity = watch("city");
  const selectedTimezone = watch("timezone");

  const countriesData = useMemo(() => Country.getAllCountries(), []);

  const countries = useMemo<SelectOption[]>(() => {
    return countriesData
      .map((country) => ({
        label: `${country.flag} ${country.name}`,
        value: country.name,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [countriesData]);

  const currentCountryData = useMemo<ICountry | undefined>(() => {
    if (!selectedCountry) {
      return undefined;
    }

    return countriesData.find((country) => country.name === selectedCountry);
  }, [countriesData, selectedCountry]);

  const cities = useMemo<SelectOption[]>(() => {
    if (!selectedCountry) {
      return [];
    }

    if (!currentCountryData?.isoCode) {
      return [];
    }

    const items = City.getCitiesOfCountry(currentCountryData.isoCode) ?? [];
    const deduped = new Map<string, SelectOption>();

    items.forEach((city) => {
      if (!deduped.has(city.name)) {
        deduped.set(city.name, {
          label: city.name,
          value: city.name,
        });
      }
    });

    return Array.from(deduped.values()).sort((a, b) =>
      a.label.localeCompare(b.label),
    );
  }, [currentCountryData?.isoCode, selectedCountry]);

  const timezones = useMemo<SelectOption[]>(() => {
    if (!currentCountryData?.timezones?.length) {
      return [];
    }

    return currentCountryData.timezones.map((tz) => ({
      label: `${tz.zoneName} (${tz.gmtOffsetName})`,
      value: tz.zoneName,
    }));
  }, [currentCountryData]);

  const animateStepTransition = (
    direction: "next" | "back",
    onSwitchStep: () => number,
  ): void => {
    if (isTransitioning) {
      return;
    }

    setIsTransitioning(true);
    const outgoingOffset = direction === "next" ? -28 : 28;
    const incomingOffset = direction === "next" ? 28 : -28;

    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: outgoingOffset,
        duration: 130,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 120,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.985,
        duration: 120,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      const nextStep = onSwitchStep();
      setDisplayStep(nextStep);

      slideAnim.setValue(incomingOffset);
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.985);

      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 90,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsTransitioning(false);
      });
    });
  };

  useEffect(() => {
    const values = getValues();

    setOnboardingData({
      name: values.name,
      age: values.age,
      gender: values.gender,
      weight: values.weight,
      height: values.height,
      activityType: values.activityType,
      gymTime: values.gymTime,
      goal: values.goal,
      dietPref: {
        isVeg: values.isVeg,
        allergies: values.allergies,
        chronicConditions: values.chronicConditions as ChronicCondition[],
        fastingWindow:
          values.fastingStart && values.fastingEnd
            ? { start: values.fastingStart, end: values.fastingEnd }
            : undefined,
      },
      schedule: {
        wakeTime: values.wakeTime,
        sleepTime: values.sleepTime,
        officeStart: values.officeStart,
        officeEnd: values.officeEnd,
        gymStart: values.gymStart,
        gymEnd: values.gymEnd,
      },
      location: {
        country: values.country,
        city: values.city,
        timezone: values.timezone,
      },
      femaleTrackCycle: values.femaleTrackCycle,
      female:
        values.gender === "female" && values.femaleTrackCycle
          ? {
              trackCycle: values.femaleTrackCycle,
              lastPeriodDate: values.lastPeriodDate
                ? new Date(values.lastPeriodDate)
                : undefined,
              cycleLength: values.cycleLength,
            }
          : undefined,
    });
  }, [
    getValues,
    setOnboardingData,
    watch("activityType"),
    watch("age"),
    watch("allergies"),
    watch("city"),
    watch("country"),
    watch("cycleLength"),
    watch("fastingEnd"),
    watch("fastingStart"),
    watch("femaleTrackCycle"),
    watch("gender"),
    watch("goal"),
    watch("gymEnd"),
    watch("gymStart"),
    watch("gymTime"),
    watch("height"),
    watch("isVeg"),
    watch("lastPeriodDate"),
    watch("name"),
    watch("officeEnd"),
    watch("officeStart"),
    watch("sleepTime"),
    watch("timezone"),
    watch("wakeTime"),
    watch("weight"),
  ]);

  useEffect(() => {
    if (profile?.isOnboardingComplete) {
      setOnboarded(true);
      router.replace("/(tabs)/dashboard");
    }
  }, [profile?.isOnboardingComplete, setOnboarded]);

  const validateCurrentStep = async (): Promise<boolean> => {
    const stepFields: Record<number, Array<FieldPath<OnboardingFormValues>>> = {
      1: ["name", "age", "gender"],
      2: ["weight", "height", "activityType", "gymTime", "goal"],
      3: ["isVeg"],
      4: ["wakeTime", "sleepTime"],
      5: ["country", "city", "timezone"],
      6: ["chronicConditions"],
      7: ["femaleTrackCycle"],
    };

    const fields = stepFields[onboardingStep] ?? [];
    const valid = await trigger(fields);
    if (!valid) {
      return false;
    }

    if (onboardingStep === 7 && watch("femaleTrackCycle")) {
      const lastPeriodDate = getValues("lastPeriodDate");
      const cycleLength = getValues("cycleLength");

      if (!lastPeriodDate) {
        setError("lastPeriodDate", {
          type: "manual",
          message: "Please select last period date",
        });
        return false;
      }

      clearErrors("lastPeriodDate");

      if (!cycleLength || cycleLength < 21 || cycleLength > 35) {
        setError("cycleLength", {
          type: "manual",
          message: "Cycle length must be between 21 and 35 days",
        });
        return false;
      }

      clearErrors("cycleLength");
    }

    return true;
  };

  const next = async (): Promise<void> => {
    const valid = await validateCurrentStep();
    if (!valid) {
      return;
    }

    animateStepTransition("next", () => {
      const nextStepValue = Math.min(TOTAL_STEPS, onboardingStep + 1);
      setOnboardingStep(nextStepValue);
      return showFemaleStep ? nextStepValue : Math.min(TOTAL_STEPS - 1, nextStepValue);
    });
  };

  const back = (): void => {
    animateStepTransition("back", () => {
      const previousStep = Math.max(1, onboardingStep - 1);
      setOnboardingStep(previousStep);
      return showFemaleStep ? previousStep : Math.min(TOTAL_STEPS - 1, previousStep);
    });
  };

  const submit = async (): Promise<void> => {
    const values = getValues();

    const payload: OnboardingProfileInput = {
      name: values.name,
      age: values.age,
      gender: values.gender,
      weight: values.weight,
      height: values.height,
      activityType: values.activityType,
      gymTime: values.gymTime,
      goal: values.goal,
      dietPref: {
        isVeg: values.isVeg,
        allergies: values.allergies,
        chronicConditions: values.chronicConditions as ChronicCondition[],
        fastingWindow:
          values.fastingStart && values.fastingEnd
            ? {
                start: values.fastingStart,
                end: values.fastingEnd,
              }
            : undefined,
      },
      schedule: {
        wakeTime: values.wakeTime,
        sleepTime: values.sleepTime,
        officeStart: values.officeStart,
        officeEnd: values.officeEnd,
        gymStart: values.gymStart,
        gymEnd: values.gymEnd,
      },
      location: {
        country: values.country,
        city: values.city,
        timezone: values.timezone,
      },
      female:
        values.gender === "female" && values.femaleTrackCycle
          ? {
              trackCycle: true,
              lastPeriodDate: values.lastPeriodDate
                ? new Date(values.lastPeriodDate)
                : undefined,
              cycleLength: values.cycleLength,
            }
          : undefined,
    };

    try {
      await createProfileMutation.mutateAsync(payload);
      setOnboarded(true);
      resetOnboarding();
      router.replace("/(tabs)/dashboard");
    } catch {
      // error shown in UI below
    }
  };

  const title =
    displayStep === 1
      ? "Tell us about you"
      : displayStep === 2
        ? "Body and goals"
        : displayStep === 3
          ? "Diet preferences"
          : displayStep === 4
            ? "Daily schedule"
            : displayStep === 5
              ? "Location & timezone"
              : displayStep === 6
                ? "Health conditions"
                : "Cycle preferences";

  const subtitle =
    displayStep === 1
      ? "We personalize your plan from this"
      : displayStep === 2
        ? "Metrics help us calculate macros"
        : displayStep === 3
          ? "Vegetarian-first meal planning"
          : displayStep === 4
            ? "We send reminders at the right time"
            : displayStep === 5
              ? "For festivals and local timing"
              : displayStep === 6
                ? "Helps us tailor your diet and AI advice"
                : "Optional wellness optimization";

  if (isProfileLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <AharText variant="h3" weight="bold">
          Onboarding ({displayStep}/{effectiveTotalSteps})
        </AharText>
        <AharProgressBar progress={displayStep / effectiveTotalSteps} />

        <Animated.View
          style={[
            styles.stepContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateX: slideAnim }, { scale: scaleAnim }],
            },
          ]}
        >
          <OnboardingStep title={title} subtitle={subtitle}>
            <ScrollView
              key={`onboarding-step-${displayStep}`}
              showsVerticalScrollIndicator={false}
              style={styles.stepScroll}
              contentContainerStyle={styles.stepScrollContent}
              bounces={false}
            >
              {displayStep === 1 ? (
                <View style={styles.stepContent}>
                  <Controller
                    control={control}
                    name="name"
                    render={({ field: { onChange, value } }) => (
                      <AharInput
                        label="Name"
                        placeholder="Your full name"
                        value={value}
                        onChangeText={onChange}
                        error={errors.name?.message}
                      />
                    )}
                  />

                  <Controller
                    control={control}
                    name="age"
                    render={({ field: { onChange, value } }) => (
                      <AharSlider
                        label="Age"
                        value={value}
                        minimumValue={13}
                        maximumValue={70}
                        onValueChange={onChange}
                        suffix=" yrs"
                      />
                    )}
                  />

                  <View style={styles.chipRow}>
                    {[
                      { label: "Male", value: "male" as const },
                      { label: "Female", value: "female" as const },
                      { label: "Other", value: "other" as const },
                    ].map((option) => (
                      <AharChip
                        key={option.value}
                        label={option.label}
                        selected={watch("gender") === option.value}
                        onPress={() => setValue("gender", option.value)}
                      />
                    ))}
                  </View>
                </View>
              ) : null}

              {displayStep === 2 ? (
                <View style={styles.stepContent}>
                  <Controller
                    control={control}
                    name="weight"
                    render={({ field: { onChange, value } }) => (
                      <AharSlider
                        label="Weight"
                        value={value}
                        minimumValue={35}
                        maximumValue={150}
                        onValueChange={onChange}
                        suffix=" kg"
                      />
                    )}
                  />

                  <Controller
                    control={control}
                    name="height"
                    render={({ field: { onChange, value } }) => (
                      <AharSlider
                        label="Height"
                        value={value}
                        minimumValue={130}
                        maximumValue={220}
                        onValueChange={onChange}
                        suffix=" cm"
                      />
                    )}
                  />

                  <AharText variant="label" color={COLORS.textSecondary}>
                    Activity
                  </AharText>
                  <View style={styles.chipWrap}>
                    {["gym", "home", "run", "walk", "desk", "yoga"].map(
                      (activity) => (
                        <AharChip
                          key={activity}
                          label={activity.toUpperCase()}
                          selected={watch("activityType") === activity}
                          onPress={() =>
                            setValue(
                              "activityType",
                              activity as OnboardingFormValues["activityType"],
                            )
                          }
                        />
                      ),
                    )}
                  </View>

                  <AharText variant="label" color={COLORS.textSecondary}>
                    Gym time preference
                  </AharText>
                  <View style={styles.chipRow}>
                    {[
                      { label: "Morning", value: "morning" as const },
                      { label: "Evening", value: "evening" as const },
                      { label: "No Gym", value: "none" as const },
                    ].map((option) => (
                      <AharChip
                        key={option.value}
                        label={option.label}
                        selected={watch("gymTime") === option.value}
                        onPress={() => setValue("gymTime", option.value)}
                      />
                    ))}
                  </View>

                  <AharText variant="label" color={COLORS.textSecondary}>
                    Goal
                  </AharText>
                  <View style={styles.chipRow}>
                    {[
                      { label: "Lose", value: "lose" as const },
                      { label: "Gain", value: "gain" as const },
                      { label: "Maintain", value: "maintain" as const },
                    ].map((option) => (
                      <AharChip
                        key={option.value}
                        label={option.label}
                        selected={watch("goal") === option.value}
                        onPress={() => setValue("goal", option.value)}
                      />
                    ))}
                  </View>
                </View>
              ) : null}

              {displayStep === 3 ? (
                <View style={styles.stepContent}>
                  <AharText variant="label" color={COLORS.textSecondary}>
                    Vegetarian preference
                  </AharText>
                  <View style={styles.chipRow}>
                    <AharChip
                      label="Vegetarian"
                      selected={watch("isVeg")}
                      onPress={() => setValue("isVeg", true)}
                    />
                    <AharChip
                      label="Custom"
                      selected={!watch("isVeg")}
                      onPress={() => setValue("isVeg", false)}
                    />
                  </View>

                  <AharText variant="label" color={COLORS.textSecondary}>
                    Allergies
                  </AharText>
                  <View style={styles.chipWrap}>
                    {ALLERGY_OPTIONS.map((allergy) => {
                      const selected = watch("allergies").includes(allergy);

                      return (
                        <AharChip
                          key={allergy}
                          label={allergy}
                          selected={selected}
                          onPress={() => {
                            const current = watch("allergies");
                            if (selected) {
                              setValue(
                                "allergies",
                                current.filter((item) => item !== allergy),
                              );
                              return;
                            }

                            setValue("allergies", [...current, allergy]);
                          }}
                        />
                      );
                    })}
                  </View>

                  <AharText variant="label" color={COLORS.textSecondary}>
                    Fasting window (optional)
                  </AharText>
                  <AharText variant="caption" color={COLORS.textMuted}>
                    Enter eating window start and end time. Example: 10:00 to
                    18:00 means you eat between 10 AM and 6 PM and fast outside
                    this range.
                  </AharText>
                  <View style={styles.row}>
                    <Controller
                      control={control}
                      name="fastingStart"
                      render={({ field: { onChange, value } }) => (
                        <View style={styles.flexItem}>
                          <AharTimePicker
                            label="Start"
                            value={value}
                            onChange={onChange}
                          />
                        </View>
                      )}
                    />

                    <Controller
                      control={control}
                      name="fastingEnd"
                      render={({ field: { onChange, value } }) => (
                        <View style={styles.flexItem}>
                          <AharTimePicker
                            label="End"
                            value={value}
                            onChange={onChange}
                          />
                        </View>
                      )}
                    />
                  </View>
                </View>
              ) : null}

              {displayStep === 4 ? (
                <View style={styles.stepContent}>
                  <Controller
                    control={control}
                    name="wakeTime"
                    render={({ field: { onChange, value } }) => (
                      <AharTimePicker
                        label="Wake up"
                        value={value}
                        onChange={onChange}
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name="sleepTime"
                    render={({ field: { onChange, value } }) => (
                      <AharTimePicker
                        label="Sleep"
                        value={value}
                        onChange={onChange}
                      />
                    )}
                  />

                  <View style={styles.row}>
                    <Controller
                      control={control}
                      name="officeStart"
                      render={({ field: { onChange, value } }) => (
                        <View style={styles.flexItem}>
                          <AharTimePicker
                            label="Office start"
                            value={value}
                            onChange={onChange}
                          />
                        </View>
                      )}
                    />
                    <Controller
                      control={control}
                      name="officeEnd"
                      render={({ field: { onChange, value } }) => (
                        <View style={styles.flexItem}>
                          <AharTimePicker
                            label="Office end"
                            value={value}
                            onChange={onChange}
                          />
                        </View>
                      )}
                    />
                  </View>

                  <View style={styles.row}>
                    <Controller
                      control={control}
                      name="gymStart"
                      render={({ field: { onChange, value } }) => (
                        <View style={styles.flexItem}>
                          <AharTimePicker
                            label="Gym start"
                            value={value}
                            onChange={onChange}
                          />
                        </View>
                      )}
                    />
                    <Controller
                      control={control}
                      name="gymEnd"
                      render={({ field: { onChange, value } }) => (
                        <View style={styles.flexItem}>
                          <AharTimePicker
                            label="Gym end"
                            value={value}
                            onChange={onChange}
                          />
                        </View>
                      )}
                    />
                  </View>
                </View>
              ) : null}

              {displayStep === 5 ? (
                <View style={styles.stepContent}>
                  <AharText variant="label" color={COLORS.textSecondary}>
                    Country
                  </AharText>
                  <Pressable
                    style={styles.selectTrigger}
                    onPress={() => setCountryPickerOpen(true)}
                  >
                    <AharText>
                      {selectedCountry || "Select your country"}
                    </AharText>
                    <Ionicons
                      name="chevron-down-outline"
                      size={18}
                      color={COLORS.textMuted}
                    />
                  </Pressable>
                  {errors.country?.message ? (
                    <AharText variant="caption" color={COLORS.error}>
                      {errors.country.message}
                    </AharText>
                  ) : null}

                  <AharText variant="label" color={COLORS.textSecondary}>
                    City
                  </AharText>
                  <Pressable
                    style={styles.selectTrigger}
                    onPress={() => setCityPickerOpen(true)}
                    disabled={!selectedCountry}
                  >
                    <AharText
                      color={selectedCountry ? undefined : COLORS.textMuted}
                    >
                      {selectedCity || "Select your city"}
                    </AharText>
                    <Ionicons
                      name="chevron-down-outline"
                      size={18}
                      color={COLORS.textMuted}
                    />
                  </Pressable>
                  {errors.city?.message ? (
                    <AharText variant="caption" color={COLORS.error}>
                      {errors.city.message}
                    </AharText>
                  ) : null}

                  <AharText variant="label" color={COLORS.textSecondary}>
                    Timezone
                  </AharText>
                  <Pressable
                    style={styles.selectTrigger}
                    onPress={() => setTimezonePickerOpen(true)}
                    disabled={!selectedCountry}
                  >
                    <AharText
                      color={selectedCountry ? undefined : COLORS.textMuted}
                    >
                      {selectedTimezone || "Select your timezone"}
                    </AharText>
                    <Ionicons
                      name="chevron-down-outline"
                      size={18}
                      color={COLORS.textMuted}
                    />
                  </Pressable>
                  {errors.timezone?.message ? (
                    <AharText variant="caption" color={COLORS.error}>
                      {errors.timezone.message}
                    </AharText>
                  ) : null}
                </View>
              ) : null}

              {displayStep === 6 ? (
                <View style={styles.stepContent}>
                  <AharText variant="caption" color={COLORS.textSecondary}>
                    Select any chronic conditions you have. We use this to
                    personalise your meals and avoid foods that conflict with
                    your health needs. Select &quot;None&quot; if none apply.
                  </AharText>
                  <View style={styles.chipWrap}>
                    {CHRONIC_CONDITIONS.filter((c) => c !== "none").map((condition) => {
                      const selected = watch("chronicConditions").includes(condition);
                      return (
                        <AharChip
                          key={condition}
                          label={CHRONIC_CONDITION_LABELS[condition]}
                          selected={selected}
                          onPress={() => {
                            const current = watch("chronicConditions");
                            if (selected) {
                              setValue(
                                "chronicConditions",
                                current.filter((item) => item !== condition),
                              );
                            } else {
                              setValue("chronicConditions", [...current, condition]);
                            }
                          }}
                        />
                      );
                    })}
                  </View>
                </View>
              ) : null}

              {displayStep === 7 ? (
                <View style={styles.stepContent}>
                  <AharText variant="label" color={COLORS.textSecondary}>
                    Track menstrual cycle?
                  </AharText>
                  <View style={styles.chipRow}>
                    <AharChip
                      label="Yes"
                      selected={watch("femaleTrackCycle")}
                      onPress={() => setValue("femaleTrackCycle", true)}
                    />
                    <AharChip
                      label="No"
                      selected={!watch("femaleTrackCycle")}
                      onPress={() => setValue("femaleTrackCycle", false)}
                    />
                  </View>

                  {watch("femaleTrackCycle") ? (
                    <>
                      <Controller
                        control={control}
                        name="lastPeriodDate"
                        render={({ field: { onChange, value } }) => (
                          <AharDatePicker
                            label="Last period date"
                            value={value ?? ""}
                            onChange={onChange}
                          />
                        )}
                      />
                      {errors.lastPeriodDate?.message ? (
                        <AharText variant="caption" color={COLORS.error}>
                          {errors.lastPeriodDate.message}
                        </AharText>
                      ) : null}

                      <Controller
                        control={control}
                        name="cycleLength"
                        render={({ field: { onChange, value } }) => (
                          <AharSlider
                            label="Cycle length"
                            value={value ?? 28}
                            minimumValue={21}
                            maximumValue={35}
                            onValueChange={onChange}
                            suffix=" days"
                          />
                        )}
                      />
                    </>
                  ) : null}
                </View>
              ) : null}
            </ScrollView>
          </OnboardingStep>
        </Animated.View>

        <SearchSelectModal
          visible={countryPickerOpen}
          title="Select country"
          options={countries}
          selectedValue={selectedCountry}
          onClose={() => setCountryPickerOpen(false)}
          onSelect={(country) => {
            setValue("country", country, { shouldValidate: true });
            setValue("city", "", { shouldValidate: true });
            const matchedCountry = countriesData.find(
              (c) => c.name === country,
            );
            const firstTimezone = matchedCountry?.timezones?.[0]?.zoneName;
            setValue("timezone", firstTimezone ?? "", { shouldValidate: true });
          }}
        />

        <SearchSelectModal
          visible={cityPickerOpen}
          title="Select city"
          options={cities}
          selectedValue={selectedCity}
          onClose={() => setCityPickerOpen(false)}
          onSelect={(city) => {
            setValue("city", city, { shouldValidate: true });
          }}
        />

        <SearchSelectModal
          visible={timezonePickerOpen}
          title="Select timezone"
          options={timezones}
          selectedValue={selectedTimezone}
          onClose={() => setTimezonePickerOpen(false)}
          onSelect={(timezone) => {
            setValue("timezone", timezone, { shouldValidate: true });
          }}
        />

        {createProfileMutation.error ? (
          <AharText variant="caption" color={COLORS.error}>
            {createProfileMutation.error.message}
          </AharText>
        ) : null}

        <View style={styles.footerActions}>
          <AharButton
            label="Back"
            variant="ghost"
            onPress={back}
            disabled={
              displayStep === 1 ||
              createProfileMutation.isPending ||
              isTransitioning
            }
            style={styles.footerButton}
          />

          {displayStep < effectiveTotalSteps ? (
            <AharButton
              label="Continue"
              onPress={next}
              loading={createProfileMutation.isPending}
              disabled={isTransitioning}
              style={styles.footerButton}
            />
          ) : (
            <AharButton
              label="Finish setup"
              onPress={submit}
              loading={createProfileMutation.isPending}
              disabled={isTransitioning}
              style={styles.footerButton}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.xxl,
    gap: SPACING.md,
  },
  stepContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stepScroll: {
    flex: 1,
  },
  stepScrollContent: {
    flexGrow: 1,
  },
  stepContent: {
    gap: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  row: {
    flexDirection: "row",
    gap: SPACING.md,
  },
  flexItem: {
    flex: 1,
  },
  chipRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  chipWrap: {
    flexDirection: "row",
    gap: SPACING.sm,
    flexWrap: "wrap",
  },
  selectTrigger: {
    height: 52,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.input,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectBackdrop: {
    flex: 1,
    backgroundColor: COLORS.overlay45,
    justifyContent: "flex-end",
  },
  selectKeyboardWrap: {
    flex: 1,
  },
  selectBackdropPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  selectCard: {
    maxHeight: "78%",
    backgroundColor: COLORS.surface2,
    borderTopLeftRadius: BORDER_RADIUS.card,
    borderTopRightRadius: BORDER_RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xxl,
    gap: SPACING.md,
  },
  selectDragHandle: {
    width: 52,
    height: 4,
    borderRadius: 999,
    alignSelf: "center",
    marginTop: -SPACING.sm,
    backgroundColor: COLORS.border,
  },
  searchInputWrap: {
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.input,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 15,
  },
  selectListContent: {
    gap: SPACING.xs,
    paddingBottom: SPACING.xxl,
  },
  selectList: {
    maxHeight: 340,
  },
  selectOption: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.input,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  selectOptionSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  footerActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: SPACING.md,
  },
  footerButton: {
    flex: 1,
  },
});

export default OnboardingScreen;
