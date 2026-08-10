/**
 * Vercel serverless entry point.
 * Vercel auto-compiles this TypeScript file using @vercel/node.
 */
import "../src/loadEnv";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import app from "../src/app";
import { createNestApp } from "../src/app.nest";
import { getStore } from "../src/lib/store";

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await ensureInitialized();
  return app(req, res);
}
