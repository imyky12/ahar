import type { ErrorRequestHandler } from "express";
import { MongoServerError } from "mongodb";
import { ZodError } from "zod";

import { logger } from "../utils/logger";
import { AuthError } from "../utils/jwt";
import { AppError } from "../utils/errors";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  logger.error(
    error instanceof Error ? (error.stack ?? error.message) : String(error),
  );

  if (error instanceof ZodError) {
    const message = error.issues[0]?.message ?? "Validation error";
    res
      .status(400)
      .json({ success: false, error: message, code: "VALIDATION_ERROR" });
    return;
  }

  if (error instanceof MongoServerError && error.code === 11000) {
    res
      .status(409)
      .json({
        success: false,
        error: "Resource already exists",
        code: "DUPLICATE_KEY",
      });
    return;
  }

  if (error instanceof AuthError) {
    res
      .status(401)
      .json({ success: false, error: error.message, code: error.code });
    return;
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      error: error.message,
      code: error.code,
    });
    return;
  }

  if (error instanceof Error) {
    res
      .status(500)
      .json({ success: false, error: error.message, code: "INTERNAL_ERROR" });
    return;
  }

  res
    .status(500)
    .json({
      success: false,
      error: "Internal server error",
      code: "INTERNAL_ERROR",
    });
};
