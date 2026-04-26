import type { RequestHandler } from "express";
import { z } from "zod";

import { ActivityLogModel } from "../models/ActivityLog";
import { UserModel } from "../models/User";
import {
  AuthError,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt";
import { ConflictError } from "../utils/errors";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[A-Z]/, "Password must include an uppercase letter")
    .regex(/[0-9]/, "Password must include a number"),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const getRequestMetadata = (
  req: Parameters<RequestHandler>[0],
): {
  ipAddress?: string;
  userAgent?: string;
} => ({
  ipAddress: req.ip,
  userAgent: req.get("user-agent") ?? undefined,
});

export const register: RequestHandler = async (req, res, next) => {
  try {
    const payload = req.body as z.infer<typeof registerSchema>;

    const existingUser = await UserModel.findActive(payload.email);
    if (existingUser) {
      throw new ConflictError("Email already taken");
    }

    const user = await UserModel.create({
      email: payload.email,
      passwordHash: payload.password,
    });

    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());

    await ActivityLogModel.create({
      userId: user._id.toString(),
      action: "register",
      metadata: { email: user.email },
      ...getRequestMetadata(req),
      timestamp: new Date(),
    });

    res.status(201).json({
      success: true,
      data: {
        user: {
          _id: user._id,
          email: user.email,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login: RequestHandler = async (req, res, next) => {
  try {
    const payload = req.body as z.infer<typeof loginSchema>;

    const user = await UserModel.findActive(payload.email);
    if (!user) {
      throw new AuthError("Invalid credentials", "INVALID_CREDENTIALS");
    }

    const passwordMatches = await user.comparePassword(payload.password);
    if (!passwordMatches) {
      throw new AuthError("Invalid credentials", "INVALID_CREDENTIALS");
    }

    user.lastLoginAt = new Date();
    await user.save();

    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());

    await ActivityLogModel.create({
      userId: user._id.toString(),
      action: "login",
      metadata: { email: user.email },
      ...getRequestMetadata(req),
      timestamp: new Date(),
    });

    res.status(200).json({
      success: true,
      data: {
        user: {
          _id: user._id,
          email: user.email,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refresh: RequestHandler = async (req, res, next) => {
  try {
    const payload = req.body as z.infer<typeof refreshSchema>;
    const { userId } = verifyRefreshToken(payload.refreshToken);

    const user = await UserModel.findById(userId)
      .select("_id isDeleted")
      .lean();
    if (!user || user.isDeleted) {
      throw new AuthError("Unauthorized", "UNAUTHORIZED");
    }

    const accessToken = generateAccessToken(userId);
    res.status(200).json({ success: true, data: { accessToken } });
  } catch (error) {
    next(error);
  }
};

export const logout: RequestHandler = async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new AuthError("Unauthorized", "UNAUTHORIZED");
    }

    await ActivityLogModel.create({
      userId: req.userId,
      action: "logout",
      metadata: {},
      ...getRequestMetadata(req),
      timestamp: new Date(),
    });

    res.status(200).json({ success: true, data: { message: "Logged out" } });
  } catch (error) {
    next(error);
  }
};

export const getMe: RequestHandler = async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new AuthError("Unauthorized", "UNAUTHORIZED");
    }

    const user = await UserModel.findById(req.userId)
      .select("_id email isVerified isDeleted lastLoginAt createdAt updatedAt")
      .lean();

    if (!user || user.isDeleted) {
      throw new AuthError("Unauthorized", "UNAUTHORIZED");
    }

    res.status(200).json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
};
