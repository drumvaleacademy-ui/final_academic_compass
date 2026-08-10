/**
 * Vercel serverless entry point.
 * Vercel auto-compiles this TypeScript file using @vercel/node.
 */
import "../src/loadEnv";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { RequestHandler } from "express";
import app from "../src/app";
import { createNestApp } from "../src/app.nest";
import { getStore } from "../src/lib/store";

// Cast to RequestHandler so TypeScript knows it's callable and has .use()
const expressApp = app as unknown as {
  use: (path: string, handler: RequestHandler) => void;
} & RequestHandler;

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
    expressApp.use("/api/v2", router as unknown as RequestHandler);
    console.log("[vercel] NestJS API mounted at /api/v2");
  } catch (err) {
    console.error("[vercel] Failed to initialize NestJS API:", err);
    process.exit(1);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await ensureInitialized();
  return expressApp(req as any, res as any);
}
