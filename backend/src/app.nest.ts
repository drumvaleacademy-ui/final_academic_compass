import { NestFactory } from "@nestjs/core";
import { AppModule } from "./modules/app.module";
import { ExpressAdapter } from "@nestjs/platform-express";
import express from "express";

export async function createNestApp() {
  const router = express.Router();
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(router),
    { logger: false }
  );

  app.setGlobalPrefix("v2");
  app.enableCors({
    origin: process.env.FRONTEND_URL || true,
    credentials: true,
  });

  return { app, router };
}
