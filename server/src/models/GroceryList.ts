import { Schema, model, type Types } from "mongoose";

interface IGroceryItem {
  name: string;
  quantity: string;
  unit: string;
  isAvailable?: boolean;
}

export interface IGroceryList {
  _id?: Types.ObjectId;
  userId: string;
  date: string;
  items: IGroceryItem[];
  generatedAt: Date;
  planId: Types.ObjectId;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const groceryItemSchema = new Schema<IGroceryItem>(
  {
    name: { type: String, required: true },
    quantity: { type: String, required: true },
    unit: { type: String, required: true },
    isAvailable: { type: Boolean, default: false },
  },
  { _id: false },
);

const groceryListSchema = new Schema<IGroceryList>(
  {
    userId: { type: String, required: true, index: true },
    date: { type: String, required: true, index: true },
    items: { type: [groceryItemSchema], required: true, default: [] },
    generatedAt: { type: Date, required: true, default: () => new Date() },
    planId: {
      type: Schema.Types.ObjectId,
      ref: "DietPlan",
      required: true,
      index: true,
    },
    isDeleted: { type: Boolean, default: false, required: true },
  },
  {
    timestamps: true,
  },
);

groceryListSchema.index({ userId: 1, date: 1 }, { unique: true });

export const GroceryListModel = model<IGroceryList>(
  "GroceryList",
  groceryListSchema,
);
