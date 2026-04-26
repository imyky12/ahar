import { Schema, model } from "mongoose";

export type QuoteCategory = "motivational" | "funny" | "fitness" | "mindfulness";

export interface IDailyQuote {
  date: string;          // YYYY-MM-DD
  category: QuoteCategory;
  chunkIndex: number;    // which user-chunk this quote was generated for
  text: string;
  author: string;
  notificationTitle: string;
  generatedAt: Date;
}

const dailyQuoteSchema = new Schema<IDailyQuote>(
  {
    date: { type: String, required: true },
    category: {
      type: String,
      enum: ["motivational", "funny", "fitness", "mindfulness"],
      required: true,
    },
    chunkIndex: { type: Number, required: true },
    text: { type: String, required: true },
    author: { type: String, required: true },
    notificationTitle: { type: String, required: true },
    generatedAt: { type: Date, required: true, default: () => new Date() },
  },
  {
    // No user-owned data — no isDeleted or timestamps needed
    versionKey: false,
  },
);

// One quote per date + category + chunk
dailyQuoteSchema.index(
  { date: 1, category: 1, chunkIndex: 1 },
  { unique: true },
);

// Fast lookup when fetching quote for a user
dailyQuoteSchema.index({ date: 1 });

export const DailyQuoteModel = model<IDailyQuote>("DailyQuote", dailyQuoteSchema);
