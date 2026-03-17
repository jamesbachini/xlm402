import express from "express";
import cors from "cors";
import helmet from "helmet";
import { publicRouter } from "./routes/public.js";
import { createChatRouter } from "./routes/chat.js";
import { createImageRouter } from "./routes/image.js";
import { createWeatherRouter } from "./routes/weather.js";
import { createX402Middleware } from "./middleware/x402.js";
import { errorHandler, notFoundHandler } from "./middleware/errors.js";
import { config } from "./config.js";

export async function createApp() {
  const app = express();

  app.set("trust proxy", true);
  app.disable("x-powered-by");
  app.use(cors());
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "https://esm.sh"],
          scriptSrcAttr: ["'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          connectSrc: ["'self'", config.publicBaseUrl, "https://esm.sh"],
          imgSrc: ["'self'", "data:"],
        },
      },
    }),
  );
  app.use(express.json());

  app.use((req, _res, next) => {
    if (config.logPayments) {
      console.log(`${req.method} ${req.originalUrl}`);
    }
    next();
  });

  app.use(publicRouter);
  app.use(await createX402Middleware());
  app.use(
    "/weather",
    createWeatherRouter({
      network: "mainnet",
      priceUsd: config.prices.weather,
    }),
  );
  app.use(
    "/testnet/weather",
    createWeatherRouter({
      network: "testnet",
      priceUsd: config.prices.weather,
    }),
  );

  if (config.openai.enabled) {
    app.use("/chat", createChatRouter());
    app.use("/image", createImageRouter());
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
