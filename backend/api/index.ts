/**
 * Vercel serverless entry point.
 * Vercel auto-compiles this TypeScript file using @vercel/node.
 *
 * IMPORTANT: No static imports of src/* here — all imports are dynamic so that
 * loadEnv() runs first and process.env is populated before any module-level
 * code (like the SESSION_SECRET guard in routes/auth.ts) executes.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import dotenv from "dotenv";
import { join } from "node:path";

// Load .env synchronously before anything else touches process.env.
// On Vercel, vars are already in process.env so this is a no-op.
dotenv.config({ path: join(process.cwd(), ".env") });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let expressApp: any = null;
let initialized = false;
let initError: Error | null = null;

async function ensureInitialized() {
  if (initialized || initError) return;

  try {
    // Dynamic import — runs AFTER dotenv.config() above
    const { default: app } = await import("../src/app");
    expressApp = app;
    console.log("[vercel] Express app loaded");
  } catch (err) {
    initError = err instanceof Error ? err : new Error(String(err));
    console.error("[vercel] Failed to load Express app:", initError.message);
    return;
  }

  try {
    const { getStore } = await import("../src/lib/store");
    await getStore();
    console.log("[vercel] Database store initialized");
  } catch (err) {
    // DB failure is non-fatal for health checks — log and continue
    console.error("[vercel] DB init failed:", err instanceof Error ? err.message : err);
  }

  try {
    const { createNestApp } = await import("../src/app.nest");
    const { router } = await createNestApp();
    expressApp.use("/api/v2", router);
    console.log("[vercel] NestJS mounted at /api/v2");
  } catch (err) {
    // NestJS failure is non-fatal for Express routes — log and continue
    console.error("[vercel] NestJS init failed:", err instanceof Error ? err.message : err);
  }

  initialized = true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await ensureInitialized();

  if (!expressApp) {
    (res as any).status(503).json({ error: "Service unavailable", detail: initError?.message });
    return;
  }

  return (expressApp as any)(req, res);
}
