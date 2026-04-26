import type { RequestHandler } from "express";

import { UserProfileModel } from "../models/UserProfile";
import { UnauthorisedError } from "../utils/errors";
import {
  getLocalDateForUser,
  getQuoteForUser,
} from "../services/quoteService";

export const getTodaysQuoteController: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    if (!req.userId) {
      throw new UnauthorisedError();
    }

    const profile = await UserProfileModel.findOne({
      userId: req.userId,
      isDeleted: { $ne: true },
    })
      .select("location.timezone")
      .lean();

    const timezone = profile?.location?.timezone ?? "Asia/Kolkata";
    const date = getLocalDateForUser(timezone);
    const quote = await getQuoteForUser(req.userId, date);

    res.status(200).json({
      success: true,
      data: {
        quote: {
          id: `${quote.date}-${quote.category}-${quote.chunkIndex}`,
          text: quote.text,
          author: quote.author,
          category: quote.category,
        },
        date,
      },
    });
  } catch (error) {
    next(error);
  }
};
