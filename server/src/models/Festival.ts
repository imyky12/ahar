import { Schema, model } from "mongoose";

export interface IFestival {
  name: string;
  country: string[];
  date: string | Date;
  isRecurring: boolean;
  fastingAllowedFoods?: string[];
  type: "festival" | "fast" | "holiday";
  region?: string;
}

const festivalSchema = new Schema<IFestival>(
  {
    name: { type: String, required: true },
    country: { type: [String], required: true },
    date: {
      type: Schema.Types.Mixed,
      required: true,
      validate: {
        validator: (value: unknown): boolean => {
          if (value instanceof Date) {
            return !Number.isNaN(value.getTime());
          }

          if (typeof value === "string") {
            return (
              /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value) ||
              !Number.isNaN(new Date(value).getTime())
            );
          }

          return false;
        },
      },
    },
    isRecurring: { type: Boolean, default: true },
    fastingAllowedFoods: { type: [String], required: false },
    type: {
      type: String,
      enum: ["festival", "fast", "holiday"],
      required: true,
    },
    region: { type: String, required: false },
  },
  { timestamps: true },
);

export const FestivalModel = model<IFestival>("Festival", festivalSchema);
