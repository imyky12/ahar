import "dotenv/config";

import cors from "cors";
import express, { type Express } from "express";
import mongoose from "mongoose";

import { healthCheck } from "./controllers/healthController";
import { apiRateLimiter } from "./middleware/auth";
import { errorHandler } from "./middleware/errorHandler";
import { requestLogger } from "./middleware/requestLogger";
import { FestivalModel } from "./models/Festival";
import { apiRouter } from "./routes";
import {
  scheduleWeeklySummaries,
  startQuoteScheduler,
  stopAll,
  startNotificationSender,
  startPlanScheduler,
} from "./services/planScheduler";
import { seedFestivals } from "./utils/seedFestivals";
import { validateEnv } from "./utils/validateEnv";
import { logger } from "./utils/logger";

validateEnv();

const createServer = (): Express => {
  const app = express();
  app.set("trust proxy", true);

  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
    : [];

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`CORS: origin ${origin} not allowed`));
        }
      },
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(requestLogger);

  app.get("/health", healthCheck);
  app.use("/api/v1", apiRateLimiter);
  app.use("/api/v1", apiRouter);
  app.use(errorHandler);

  return app;
};

const connectDatabase = async (): Promise<void> => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("MONGODB_URI is required");
  }

  await mongoose.connect(mongoUri);
  logger.info("MongoDB connection established");
};

const start = async (): Promise<void> => {
  try {
    await connectDatabase();

    const festivalCount = await FestivalModel.countDocuments();
    if (festivalCount === 0) {
      await seedFestivals();
    }

    const app = createServer();
    const port = Number(process.env.PORT ?? 3000);

    const server = app.listen(port, () => {
      logger.info(`AHAR server started on port ${port}`);
      logger.info("MongoDB: connected");
      logger.info(
        "Schedulers: plan generator, notification sender, weekly summary — all running",
      );
      logger.info(
        `Azure OpenAI: ${process.env.AZURE_OPENAI_DEPLOYMENT ?? "gpt-4o"} configured`,
      );
    });

    startPlanScheduler();
    startNotificationSender();
    scheduleWeeklySummaries();
    startQuoteScheduler();

    const shutdown = async (signal: string): Promise<void> => {
      logger.warn(`Received ${signal}. Starting graceful shutdown...`);

      server.close();
      stopAll();

      const timeout = setTimeout(async () => {
        await mongoose.connection.close();
        logger.info("Server shut down gracefully");
        process.exit(0);
      }, 5000);

      server.on("close", async () => {
        clearTimeout(timeout);
        try {
          await mongoose.connection.close();
          logger.info("Server shut down gracefully");
          process.exit(0);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unknown shutdown error";
          logger.error(`Error during shutdown: ${message}`);
          process.exit(1);
        }
      });
    };

    process.on("SIGINT", () => {
      void shutdown("SIGINT");
    });
    process.on("SIGTERM", () => {
      void shutdown("SIGTERM");
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown startup error";
    logger.error(`Failed to start server: ${message}`);
    process.exit(1);
  }
};

void start();
