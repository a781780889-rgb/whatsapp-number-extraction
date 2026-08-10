import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { env } from "./config/env.js";
import { requestLogger } from "./shared/middleware/requestLogger.middleware.js";
import { apiRateLimiter } from "./shared/middleware/rateLimit.middleware.js";
import {
  errorMiddleware,
  notFoundMiddleware,
} from "./shared/middleware/error.middleware.js";
import { authRouter } from "./auth/auth.routes.js";
import { numberExtractionRouter } from "./modules/number-extraction/routes/index.js";
import { checkDatabaseHealth } from "./db/index.js";
import { privatePublishingRouter } from "./modules/private-publishing/routes/index.js";

export function createApp() {
  const app = express();

  // Railway/أي reverse proxy — ضروري لصحة express-rate-limit و req.ip
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(compression());
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(requestLogger);
  app.use("/api", apiRateLimiter);

  app.get("/api/health", async (_req, res) => {
    const dbHealth = await checkDatabaseHealth();
    res.json({
      success: true,
      data: {
        status: dbHealth.ok ? "ok" : "degraded",
        database: dbHealth,
        timestamp: new Date().toISOString(),
      },
    });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/number-extraction", numberExtractionRouter);
  app.use("/api/private-publishing", privatePublishingRouter);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
