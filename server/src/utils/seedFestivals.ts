import { FestivalModel, type IFestival } from "../models/Festival";
import { logger } from "./logger";

export const FESTIVAL_SEED_DATA: IFestival[] = [
  {
    name: "Navratri",
    country: ["India"],
    date: "10-03",
    isRecurring: true,
    fastingAllowedFoods: [
      "Sabudana",
      "Kuttu atta",
      "Singhara atta",
      "Fruits",
      "Milk",
    ],
    type: "fast",
    region: "pan-india",
  },
  {
    name: "Ekadashi",
    country: ["India", "Nepal"],
    date: "01-11",
    isRecurring: true,
    fastingAllowedFoods: ["Fruits", "Milk", "Makhana", "Sabudana"],
    type: "fast",
    region: "pan-india",
  },
  {
    name: "Diwali",
    country: ["India", "Nepal", "Mauritius", "Fiji"],
    date: "11-01",
    isRecurring: true,
    type: "festival",
    region: "pan-india",
  },
  {
    name: "Holi",
    country: ["India", "Nepal"],
    date: "03-14",
    isRecurring: true,
    type: "festival",
    region: "north-india",
  },
  {
    name: "Ganesh Chaturthi",
    country: ["India"],
    date: "09-07",
    isRecurring: true,
    type: "festival",
    region: "maharashtra",
  },
  {
    name: "Janmashtami",
    country: ["India"],
    date: "08-26",
    isRecurring: true,
    fastingAllowedFoods: ["Fruits", "Milk", "Makhana", "Sabudana khichdi"],
    type: "fast",
    region: "pan-india",
  },
  {
    name: "Ram Navami",
    country: ["India", "Nepal"],
    date: "04-17",
    isRecurring: true,
    fastingAllowedFoods: ["Fruits", "Potato dishes", "Kuttu puri"],
    type: "fast",
    region: "north-india",
  },
  {
    name: "Karva Chauth",
    country: ["India"],
    date: "10-20",
    isRecurring: true,
    fastingAllowedFoods: ["Sargi fruits", "Dry fruits", "Milk"],
    type: "fast",
    region: "north-india",
  },
  {
    name: "Mahashivratri",
    country: ["India", "Nepal"],
    date: "03-08",
    isRecurring: true,
    fastingAllowedFoods: ["Fruits", "Milk", "Sabudana khichdi", "Peanuts"],
    type: "fast",
    region: "pan-india",
  },
  {
    name: "Pongal",
    country: ["India"],
    date: "01-15",
    isRecurring: true,
    type: "festival",
    region: "tamil-nadu",
  },
  {
    name: "Onam",
    country: ["India"],
    date: "09-10",
    isRecurring: true,
    type: "festival",
    region: "kerala",
  },
  {
    name: "Baisakhi",
    country: ["India"],
    date: "04-13",
    isRecurring: true,
    type: "festival",
    region: "punjab",
  },
  {
    name: "Durga Puja",
    country: ["India", "Bangladesh"],
    date: "10-10",
    isRecurring: true,
    type: "festival",
    region: "west-bengal",
  },
];

export const seedFestivals = async (): Promise<void> => {
  try {
    for (const festival of FESTIVAL_SEED_DATA) {
      await FestivalModel.updateOne(
        { name: festival.name, region: festival.region ?? null },
        {
          $set: {
            ...festival,
            region: festival.region ?? null,
          },
        },
        { upsert: true },
      );
    }

    logger.info(`Seeded ${FESTIVAL_SEED_DATA.length} festivals`);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown festival seed error";
    logger.error(`Failed to seed festivals: ${message}`);
  }
};
