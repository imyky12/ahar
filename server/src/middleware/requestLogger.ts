import type { RequestHandler } from "express";

import { logger } from "../utils/logger";

export const requestLogger: RequestHandler = (req, res, next) => {
  if (
    (req.method === "GET" && req.path === "/health") ||
    (req.method === "GET" && req.path === "/favicon.ico")
  ) {
    next();
    return;
  }

  const start = Date.now();

  res.on("finish", () => {
    const durationMs = Date.now() - start;
    const message = `${req.method} ${req.path} ${res.statusCode} ${durationMs}ms ${req.userId ?? "anonymous"}`;

    if (res.statusCode >= 500) {
      logger.error(message);
      return;
    }

    if (res.statusCode >= 400) {
      logger.warn(message);
      return;
    }

    logger.info(message);
  });

  next();
};
