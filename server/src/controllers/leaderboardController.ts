import type { RequestHandler } from "express";

import { getLeaderboardForUser } from "../services/leaderboardService";
import { UnauthorisedError } from "../utils/errors";

export const getLeaderboardController: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    if (!req.userId) {
      throw new UnauthorisedError();
    }

    const limit = Math.max(5, Math.min(50, Number(req.query.limit ?? 20)));
    const leaderboard = await getLeaderboardForUser(req.userId, limit);

    res.status(200).json({
      success: true,
      data: leaderboard,
    });
  } catch (error) {
    next(error);
  }
};
