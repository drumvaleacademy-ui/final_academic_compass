import { NestFactory } from "@nestjs/core";
import { AppModule } from "./modules/app.module";
import { ExpressAdapter } from "@nestjs/platform-express";
import express from "express";

export async function createNestApp() {
  // Use a Router (not a full Express app) so it mounts cleanly under /api/v2
  const router = express.Router();
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(router as any),
    { logger: ["error", "warn", "log", "debug", "verbose"] }
  );

  app.enableCors({
    origin: process.env.FRONTEND_URL || true,
    credentials: true,
  });

  await app.init();

  return { app, router };
}
