import "./loadEnv";

import { logger } from "./lib/logger";
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
    const { app } = await createNestApp();
    await app.listen(port);
    logger.info({ port }, "NestJS server listening");
  } catch (err) {
    logger.error({ err }, "Failed to start NestJS API");
    process.exit(1);
  }
})();
