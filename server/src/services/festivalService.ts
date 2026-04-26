import { addDays, format } from "date-fns";

import { FestivalModel, type IFestival } from "../models/Festival";

const normalizeCountry = (country: string): string =>
  country.trim().toLowerCase();

const dateToMmDd = (date: string): string => {
  const [year, month, day] = date.split("-");
  if (!year || !month || !day) {
    return date;
  }

  return `${month}-${day}`;
};

const toComparableDate = (mmdd: string): Date => {
  const year = new Date().getFullYear();
  return new Date(`${year}-${mmdd}`);
};

export const getTodaysFestival = async (
  country: string,
  date: string,
): Promise<IFestival | null> => {
  const mmdd = dateToMmDd(date);
  const normalized = normalizeCountry(country);

  const festivals = await FestivalModel.find({
    date: mmdd,
    country: {
      $elemMatch: {
        $regex: new RegExp(`^${normalized}$`, "i"),
      },
    },
  })
    .limit(1)
    .lean();

  return festivals[0] ?? null;
};

export const getUpcomingFestivals = async (
  country: string,
  daysAhead = 7,
): Promise<IFestival[]> => {
  const normalized = normalizeCountry(country);

  const festivals = await FestivalModel.find({
    country: {
      $elemMatch: {
        $regex: new RegExp(`^${normalized}$`, "i"),
      },
    },
  }).lean();

  const today = new Date();
  const end = addDays(today, daysAhead);

  return festivals
    .filter((festival) => {
      if (typeof festival.date !== "string") {
        return false;
      }

      const target = toComparableDate(festival.date);
      return target >= new Date(format(today, "yyyy-MM-dd")) && target <= end;
    })
    .sort((a, b) => {
      const aDate = typeof a.date === "string" ? a.date : "12-31";
      const bDate = typeof b.date === "string" ? b.date : "12-31";
      return aDate.localeCompare(bDate);
    });
};

export const isFastingDay = (festival: IFestival | null): boolean => {
  return festival?.type === "fast";
};

export const getFestivalDietGuidelines = (festival: IFestival): string => {
  const normalized = festival.name.toLowerCase();

  if (normalized.includes("navratri")) {
    return "Only sabudana, rajgira, singhare ka atta, milk, yogurt, fruits, nuts, sendha namak. No regular salt, no grains, no onion, no garlic, no non-veg.";
  }

  if (normalized.includes("ekadashi")) {
    return "No grains (rice, wheat, dal). Allow: fruits, milk, nuts, vegetables, sabudana.";
  }

  if (normalized.includes("janmashtami")) {
    return "Fasting allowed foods: milk, yogurt, fruits, dry fruits, sabudana khichdi, makhana.";
  }

  if (festival.type === "festival") {
    return "Festival day — allow moderate sweets. Keep protein targets. Avoid overindulgence.";
  }

  return "Festival day: keep meals vegetarian, maintain hydration, keep portions balanced, and avoid overprocessed foods.";
};
