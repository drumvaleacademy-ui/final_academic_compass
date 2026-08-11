import { NestFactory } from "@nestjs/core";
import { AppModule } from "./modules/app.module";

export async function createNestApp() {
  const app = await NestFactory.create(AppModule, {
    logger: ["error", "warn", "log", "debug", "verbose"],
  });

  app.enableCors({
    origin: process.env.FRONTEND_URL || true,
    credentials: true,
  });

  await app.init();

  return { app, expressApp: app.getHttpAdapter().getInstance() };
}
