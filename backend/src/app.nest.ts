import express from "express";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./modules/app.module";
import { ExpressAdapter } from "@nestjs/platform-express";

async function bootstrap() {
  const server = express();
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(server),
    { logger: ["error", "warn", "log", "debug", "verbose"] }
  );

  app.setGlobalPrefix("api/v2");
  app.enableCors({
    origin: process.env.FRONTEND_URL || true,
    credentials: true,
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`NestJS API listening on :${port}`);
}

bootstrap().catch((err) => {
  console.error("Failed to start NestJS application:", err);
  process.exit(1);
});
