import { NestFactory } from "@nestjs/core";
import { RequestMethod } from "@nestjs/common";
import { AppModule } from "./modules/app.module";

export async function createNestApp() {
  const app = await NestFactory.create(AppModule, {
    logger: ["error", "warn", "log", "debug", "verbose"],
  });

  app.setGlobalPrefix("api/v2", {
    exclude: [
      { path: "", method: RequestMethod.GET },
      { path: "api/healthz", method: RequestMethod.GET },
    ],
  });
  app.enableCors({
    origin: true,
    credentials: false,
  });

  await app.init();

  return { app, httpApp: app.getHttpAdapter().getInstance() };
}
