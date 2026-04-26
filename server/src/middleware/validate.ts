import type { RequestHandler } from "express";
import { type ZodSchema, ZodError } from "zod";

export const validate = <T>(schema: ZodSchema<T>): RequestHandler => {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req.body);
      req.body = parsed;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: "Validation failed",
          details: error.issues.map((issue) => ({
            field: issue.path,
            message: issue.message,
          })),
        });
        return;
      }

      next(error);
    }
  };
};
