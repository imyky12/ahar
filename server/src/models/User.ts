import bcrypt from "bcryptjs";
import { Model, Schema, model, type HydratedDocument } from "mongoose";

const BCRYPT_ROUNDS = 12;

export interface IUser {
  email: string;
  passwordHash: string;
  isVerified: boolean;
  isDeleted: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(plain: string): Promise<boolean>;
}

interface IUserModel extends Model<IUser> {
  findActive(email: string): Promise<HydratedDocument<IUser> | null>;
}

const userSchema = new Schema<IUser, IUserModel>(
  {
    email: {
      type: String,
      lowercase: true,
      trim: true,
      required: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    lastLoginAt: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true,
  },
);

userSchema.methods.comparePassword = async function comparePassword(
  plain: string,
): Promise<boolean> {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.statics.findActive = function findActive(
  email: string,
): Promise<HydratedDocument<IUser> | null> {
  return this.findOne({
    email: email.toLowerCase().trim(),
    isDeleted: false,
  }).exec();
};

userSchema.pre("save", async function preSave(next) {
  try {
    if (this.isModified("passwordHash")) {
      this.passwordHash = await bcrypt.hash(this.passwordHash, BCRYPT_ROUNDS);
    }
    next();
  } catch (error) {
    next(error as Error);
  }
});

userSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);

export const UserModel = model<IUser, IUserModel>("User", userSchema);
