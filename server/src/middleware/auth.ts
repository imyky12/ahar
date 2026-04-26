import type { RequestHandler } from "express";

import { verifyAccessToken } from "../utils/jwt";

const AUTH_MAX_REQUESTS_PER_MINUTE = 10;
const API_MAX_REQUESTS_PER_MINUTE = 100;
const AI_MAX_REQUESTS_PER_HOUR = 20;
const CLIENT_ERROR_MAX_PER_HOUR = 10;
const WINDOW_MS = 60 * 1000;
const HOUR_WINDOW_MS = 60 * 60 * 1000;

const authRequestStore = new Map<string, number[]>();
const apiRequestStore = new Map<string, number[]>();
const aiRequestStore = new Map<string, number[]>();
const clientErrorStore = new Map<string, number[]>();

const getClientIp = (ip: string | undefined): string => {
  if (!ip) {
    return "unknown";
  }

  return ip;
};

export const authenticate: RequestHandler = (req, res, next) => {
  try {
    const authorizationHeader = req.headers.authorization;
    if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
      res.status(401).json({ success: false, error: "Unauthorized" });
      return;
    }

    const token = authorizationHeader.replace("Bearer ", "").trim();
    const { userId } = verifyAccessToken(token);

    req.userId = userId;
    next();
  } catch {
    res.status(401).json({ success: false, error: "Unauthorized" });
  }
};

const applyLimiter = (
  store: Map<string, number[]>,
  key: string,
  max: number,
  windowMs: number,
): boolean => {
  const now = Date.now();
  const previousRequests = store.get(key) ?? [];
  const recentRequests = previousRequests.filter(
    (timestamp) => now - timestamp < windowMs,
  );

  if (recentRequests.length >= max) {
    return false;
  }

  recentRequests.push(now);
  store.set(key, recentRequests);

  return true;
};

export const authRateLimiter: RequestHandler = (req, res, next) => {
  const ip = getClientIp(req.ip);
  const allowed = applyLimiter(
    authRequestStore,
    ip,
    AUTH_MAX_REQUESTS_PER_MINUTE,
    WINDOW_MS,
  );

  if (!allowed) {
    res.status(429).json({ success: false, error: "Too many requests" });
    return;
  }

  next();
};

export const apiRateLimiter: RequestHandler = (req, res, next) => {
  const ip = getClientIp(req.ip);
  const allowed = applyLimiter(
    apiRequestStore,
    ip,
    API_MAX_REQUESTS_PER_MINUTE,
    WINDOW_MS,
  );

  if (!allowed) {
    res.status(429).json({ success: false, error: "Too many requests" });
    return;
  }

  next();
};

export const aiRateLimiter: RequestHandler = (req, res, next) => {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }

  const allowed = applyLimiter(
    aiRequestStore,
    userId,
    AI_MAX_REQUESTS_PER_HOUR,
    HOUR_WINDOW_MS,
  );

  if (!allowed) {
    res.status(429).json({ success: false, error: "AI quota exceeded" });
    return;
  }

  next();
};

export const clientErrorRateLimiter: RequestHandler = (req, res, next) => {
  const ip = getClientIp(req.ip);
  const allowed = applyLimiter(
    clientErrorStore,
    ip,
    CLIENT_ERROR_MAX_PER_HOUR,
    HOUR_WINDOW_MS,
  );

  if (!allowed) {
    res.status(429).json({ success: false, error: "Too many requests" });
    return;
  }

  next();
};

export const rateLimiter = authRateLimiter;
