import "./loadEnv";
import app from "./app";
import { createNestApp } from "./app.nest";
import { getStore } from "./lib/store";

let initialization: Promise<void> | null = null;

async function initialize() {
  await getStore();
  console.log("[vercel] Database initialized");

  const { expressApp } = await createNestApp();
  app.use("/api/v2", expressApp);
  console.log("[vercel] NestJS API mounted at /api/v2");
}

async function ensureInitialized() {
  initialization ??= initialize().catch((err) => {
    initialization = null;
    throw err;
  });
  return initialization;
}

export default async (req: any, res: any) => {
  try {
    await ensureInitialized();
    return app(req, res);
  } catch (err) {
    console.error("[vercel] Failed to initialize API:", err);
    if (!res.headersSent) {
      return res.status(503).json({ message: "API initialization failed" });
    }
    return res.end();
  }
};
