import "./loadEnv";

import app from "./app";
import { logger } from "./lib/logger";
import { getStore } from "./lib/store";
import { createNestApp } from "./app.nest";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

(async () => {
  try {
    await getStore();
    logger.info("Database initialized successfully");
  } catch (err) {
    logger.error({ err }, "Failed to initialize database");
    process.exit(1);
  }

  try {
    const { expressApp } = await createNestApp();
    app.use("/api/v2", expressApp);
    logger.info("NestJS API mounted at /api/v2");
  } catch (err) {
    logger.error({ err }, "Failed to initialize NestJS API");
    process.exit(1);
  }

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
})();
