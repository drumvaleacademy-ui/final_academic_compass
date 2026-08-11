import { NestFactory } from "@nestjs/core";
import { AppModule } from "./modules/app.module";
import { ExpressAdapter } from "@nestjs/platform-express";
import express from "express";

export async function createNestApp(expressApp = express()) {
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp as any),
    { logger: ["error", "warn", "log", "debug", "verbose"] }
  );

  app.setGlobalPrefix("api/v2");
  app.enableCors({
    origin: process.env.FRONTEND_URL || true,
    credentials: true,
  });

  await app.init();

  return { app, expressApp };
}
