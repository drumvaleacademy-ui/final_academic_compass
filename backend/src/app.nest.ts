import { NestFactory } from "@nestjs/core";
import { AppModule } from "./modules/app.module";
import { ExpressAdapter } from "@nestjs/platform-express";
import express from "express";

export async function createNestApp() {
  const expressApp = express();
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
    { logger: ["error", "warn", "log", "debug", "verbose"] }
  );

  await app.init();

  return { app, router: expressApp };
}
