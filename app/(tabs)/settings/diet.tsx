import { router } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import {
  AharButton,
  AharCard,
  AharChip,
  AharInput,
  AharText,
  AharTimePicker,
  useToast,
} from "../../../src/components/atoms";
import { KeyboardAwareScreen } from "../../../src/components/molecules";
import { COLORS, SPACING } from "../../../src/constants";
import { useProfile } from "../../../src/hooks";

const allergyOptions = ["milk", "soy", "nuts", "gluten", "sesame"];
const cuisineOptions = [
  "North Indian",
  "South Indian",
  "Maharashtra",
  "Gujarat",
  "Bengali",
  "Pan-Indian",
  "Continental (veg)",
];

export const DietPreferencesScreen = () => {
  const { profile, updateProfileMutation } = useProfile();
  const { showToast } = useToast();

  const [isVeg, setIsVeg] = useState(profile?.dietPref.isVeg ?? true);
  const [allergies, setAllergies] = useState<string[]>(
    profile?.dietPref.allergies ?? [],
  );
  const [fastingEnabled, setFastingEnabled] = useState(
    Boolean(profile?.dietPref.fastingWindow),
  );
  const [fastingStart, setFastingStart] = useState(
    profile?.dietPref.fastingWindow?.start ?? "08:00",
  );
  const [fastingEnd, setFastingEnd] = useState(
    profile?.dietPref.fastingWindow?.end ?? "20:00",
  );
  const [cuisinePreferences, setCuisinePreferences] = useState<string[]>(
    profile?.dietPref.cuisinePreferences ?? [],
  );
  const [foodsToAvoid, setFoodsToAvoid] = useState<string[]>(
    profile?.dietPref.foodsToAvoid ?? [],
  );
  const [foodInput, setFoodInput] = useState("");

  const fastingDuration = useMemo(() => {
    const [sH, sM] = fastingStart.split(":").map(Number);
    const [eH, eM] = fastingEnd.split(":").map(Number);
    const start = sH * 60 + sM;
    const end = eH * 60 + eM;
    const diff = end >= start ? end - start : 24 * 60 - start + end;
    return (diff / 60).toFixed(1);
  }, [fastingEnd, fastingStart]);

  const toggleItem = (
    arr: string[],
    value: string,
    max = Infinity,
  ): string[] => {
    if (arr.includes(value)) {
      return arr.filter((item) => item !== value);
    }
    if (arr.length >= max) {
      return arr;
    }
    return [...arr, value];
  };

  const addAvoidedFood = (): void => {
    const cleaned = foodInput.trim().toLowerCase();
    if (
      !cleaned ||
      foodsToAvoid.includes(cleaned) ||
      foodsToAvoid.length >= 10
    ) {
      setFoodInput("");
      return;
    }
    setFoodsToAvoid((prev) => [...prev, cleaned]);
    setFoodInput("");
  };

  const save = async (): Promise<void> => {
    await updateProfileMutation.mutateAsync({
      dietPref: {
        isVeg,
        allergies,
        cuisinePreferences,
        foodsToAvoid,
        fastingWindow: fastingEnabled
          ? { start: fastingStart, end: fastingEnd }
          : undefined,
      },
    });
    showToast("Diet preferences updated", "success");
    router.back();
  };

  return (
    <KeyboardAwareScreen contentContainerStyle={styles.container}>
      <AharText variant="caption" color={COLORS.textSecondary}>
        Set allergies, fasting window, cuisine preferences, and foods to avoid.
        These choices directly shape your generated vegetarian meal plan.
      </AharText>

      <AharCard style={styles.card}>
        <AharText variant="h3" weight="bold">
          Dietary restrictions
        </AharText>
        <AharText variant="caption" color={COLORS.textSecondary}>
          Keep vegetarian mode on and choose all allergens that must be excluded
          from recommendations.
        </AharText>
        <AharChip
          label={isVeg ? "Vegetarian" : "Non-vegetarian"}
          selected={isVeg}
          onPress={() => setIsVeg((prev) => !prev)}
        />
        <View style={styles.wrap}>
          {allergyOptions.map((item) => (
            <AharChip
              key={item}
              label={item}
              selected={allergies.includes(item)}
              onPress={() => setAllergies((prev) => toggleItem(prev, item))}
            />
          ))}
        </View>
      </AharCard>

      <AharCard style={styles.card}>
        <AharText variant="h3" weight="bold">
          Fasting
        </AharText>
        <AharText variant="caption" color={COLORS.textSecondary}>
          Enable this if you follow time-restricted eating. AHAR will adapt meal
          timing and reminders to this window.
        </AharText>
        <AharChip
          label={fastingEnabled ? "Fasting enabled" : "Enable fasting"}
          selected={fastingEnabled}
          onPress={() => setFastingEnabled((prev) => !prev)}
        />
        {fastingEnabled ? (
          <>
            <AharTimePicker
              label="Start"
              value={fastingStart}
              onChange={setFastingStart}
            />
            <AharTimePicker
              label="End"
              value={fastingEnd}
              onChange={setFastingEnd}
            />
            <AharText variant="caption" color={COLORS.textSecondary}>
              Duration: {fastingDuration} hours
            </AharText>
          </>
        ) : null}
      </AharCard>

      <AharCard style={styles.card}>
        <AharText variant="h3" weight="bold">
          Cuisine preferences
        </AharText>
        <AharText variant="caption" color={COLORS.textSecondary}>
          Select up to 3 cuisines you enjoy most. Plans will prioritize these
          styles while keeping macros on target.
        </AharText>
        <View style={styles.wrap}>
          {cuisineOptions.map((item) => (
            <AharChip
              key={item}
              label={item}
              selected={cuisinePreferences.includes(item)}
              onPress={() =>
                setCuisinePreferences((prev) => toggleItem(prev, item, 3))
              }
            />
          ))}
        </View>
        <AharText variant="caption" color={COLORS.textSecondary}>
          We'll prioritise these cuisines in your meal plans
        </AharText>
      </AharCard>

      <AharCard style={styles.card}>
        <AharText variant="h3" weight="bold">
          Foods to avoid
        </AharText>
        <AharText variant="caption" color={COLORS.textSecondary}>
          Add ingredients you dislike or cannot eat. Tap an added chip to remove
          it.
        </AharText>
        <AharInput
          placeholder="e.g. bitter gourd, brinjal"
          value={foodInput}
          onChangeText={setFoodInput}
        />
        <AharButton
          label="Add food"
          variant="secondary"
          onPress={addAvoidedFood}
        />
        <View style={styles.wrap}>
          {foodsToAvoid.map((food) => (
            <AharChip
              key={food}
              label={`✕ ${food}`}
              selected={true}
              onPress={() =>
                setFoodsToAvoid((prev) => prev.filter((item) => item !== food))
              }
            />
          ))}
        </View>
        <AharText variant="caption" color={COLORS.textSecondary}>
          AI will avoid these ingredients in your plans
        </AharText>
      </AharCard>

      <AharButton
        label="Save"
        fullWidth
        onPress={() => void save()}
        loading={updateProfileMutation.isPending}
      />
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
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.xs,
  },
});

export default DietPreferencesScreen;
