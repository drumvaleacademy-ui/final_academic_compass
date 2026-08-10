/**
 * Vercel serverless entry point.
 * Vercel auto-compiles this TypeScript file using @vercel/node.
 */
import "../src/loadEnv";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import app from "../src/app";

// Cast to any — @types/express@5 changed Express interface, making it non-callable directly
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const expressApp: any = app;

let initialized = false;
let initError: Error | null = null;

async function ensureInitialized() {
  if (initialized || initError) return;

  try {
    const { getStore } = await import("../src/lib/store");
    await getStore();
    console.log("[vercel] Database initialized");
  } catch (err) {
    initError = err instanceof Error ? err : new Error(String(err));
    console.error("[vercel] Failed to initialize database:", initError.message);
    return;
  }

  try {
    const { createNestApp } = await import("../src/app.nest");
    const { router } = await createNestApp();
    expressApp.use("/api/v2", router);
    console.log("[vercel] NestJS API mounted at /api/v2");
  } catch (err) {
    initError = err instanceof Error ? err : new Error(String(err));
    console.error("[vercel] Failed to initialize NestJS:", initError.message);
    return;
  }

  initialized = true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await ensureInitialized();

  if (initError) {
    console.error("[vercel] Serving request despite init error:", initError.message);
    // Don't block all requests — let Express handle what it can (healthz still works)
  }

  return expressApp(req, res);
}
