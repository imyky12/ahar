import { Schema, model, type Types } from "mongoose";

type PlanType = "regular" | "festival" | "fasting" | "rest";
type MealStatus = "pending" | "done" | "skipped" | "alternative";
type PrepTaskType = "soak" | "marinate" | "defrost" | "other";

type GenerationStatus = "generating" | "ready" | "failed";

export interface IMacros {
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
}

export interface IFoodItem {
  name: string;
  quantity: string;
  unit: string;
  macros: IMacros;
  cookTimeMinutes: number;
}

export interface IMeal {
  id: string;
  timeSlot: string;
  label: string;
  items: IFoodItem[];
  totalMacros: IMacros;
  prepTimeMinutes: number;
  status: MealStatus;
  alternativeTaken?: IFoodItem[];
}

export interface IPrepTask {
  id: string;
  instruction: string;
  scheduledFor: string;
  isDone: boolean;
  type: PrepTaskType;
}

export interface IGroceryItem {
  name: string;
  quantity: string;
  unit: string;
  isAvailable?: boolean;
}

export interface IDietPlan {
  _id?: Types.ObjectId;
  userId: string;
  date: string;
  meals: IMeal[];
  groceryList: IGroceryItem[];
  prepTasks: IPrepTask[];
  totalMacros: IMacros;
  planType: PlanType;
  festivalName?: string;
  chronicConditions?: string[];
  medicalNotes?: string;
  medicineTimingAdvice?: string[];
  aiPromptTokens: number;
  generatedAt: Date;
  isManuallyTriggered: boolean;
  isFallback: boolean;
  generationAttempts: number;
  lastError?: string;
  status: GenerationStatus;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const macrosSchema = new Schema<IMacros>(
  {
    protein: { type: Number, required: true },
    carbs: { type: Number, required: true },
    fat: { type: Number, required: true },
    calories: { type: Number, required: true },
  },
  { _id: false },
);

const foodItemSchema = new Schema<IFoodItem>(
  {
    name: { type: String, required: true },
    quantity: { type: String, required: true },
    unit: { type: String, required: true },
    macros: { type: macrosSchema, required: true },
    cookTimeMinutes: { type: Number, required: true },
  },
  { _id: false },
);

const mealSchema = new Schema<IMeal>(
  {
    id: { type: String, required: true },
    timeSlot: { type: String, required: true },
    label: { type: String, required: true },
    items: { type: [foodItemSchema], required: true },
    totalMacros: { type: macrosSchema, required: true },
    prepTimeMinutes: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "done", "skipped", "alternative"],
      default: "pending",
      required: true,
    },
    alternativeTaken: { type: [foodItemSchema], required: false },
  },
  { _id: false },
);

const prepTaskSchema = new Schema<IPrepTask>(
  {
    id: { type: String, required: true },
    instruction: { type: String, required: true },
    scheduledFor: { type: String, required: true },
    isDone: { type: Boolean, default: false },
    type: {
      type: String,
      enum: ["soak", "marinate", "defrost", "other"],
      required: true,
    },
  },
  { _id: false },
);

const groceryItemSchema = new Schema<IGroceryItem>(
  {
    name: { type: String, required: true },
    quantity: { type: String, required: true },
    unit: { type: String, required: true },
    isAvailable: { type: Boolean, default: false },
  },
  { _id: false },
);

const dietPlanSchema = new Schema<IDietPlan>(
  {
    userId: { type: String, required: true, index: true },
    date: { type: String, required: true, index: true },
    meals: { type: [mealSchema], required: true },
    groceryList: { type: [groceryItemSchema], required: true, default: [] },
    prepTasks: { type: [prepTaskSchema], required: true, default: [] },
    totalMacros: { type: macrosSchema, required: true },
    planType: {
      type: String,
      enum: ["regular", "festival", "fasting", "rest"],
      required: true,
    },
    festivalName: { type: String, required: false },
    chronicConditions: { type: [String], required: false, default: [] },
    medicalNotes: { type: String, required: false },
    medicineTimingAdvice: { type: [String], required: false, default: [] },
    aiPromptTokens: { type: Number, required: true, default: 0 },
    generatedAt: { type: Date, required: true, default: () => new Date() },
    isManuallyTriggered: { type: Boolean, default: false },
    isFallback: { type: Boolean, default: false },
    generationAttempts: { type: Number, default: 1 },
    lastError: { type: String, required: false },
    status: {
      type: String,
      enum: ["generating", "ready", "failed"],
      default: "ready",
      required: true,
    },
    isDeleted: { type: Boolean, default: false, required: true },
  },
  {
    timestamps: true,
  },
);

dietPlanSchema.index({ userId: 1, date: 1 }, { unique: true });
dietPlanSchema.index({ userId: 1, generatedAt: -1 });

export const DietPlanModel = model<IDietPlan>("DietPlan", dietPlanSchema);
