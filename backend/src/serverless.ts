import "./loadEnv";
import app from "./app";
import { createNestApp } from "./app.nest";
import { getStore } from "./lib/store";

let initialized = false;

async function ensureInitialized() {
  if (initialized) return;
  initialized = true;
  try {
    await getStore();
    console.log("[vercel] Database initialized");
  } catch (err) {
    console.error("[vercel] Failed to initialize database:", err);
    process.exit(1);
  }

  try {
    const { router } = await createNestApp();
    app.use("/api/v2", router);
    console.log("[vercel] NestJS API mounted at /api/v2");
  } catch (err) {
    console.error("[vercel] Failed to initialize NestJS API:", err);
    process.exit(1);
  }
}

export default async (req: any, res: any) => {
  await ensureInitialized();
  app(req, res);
};
