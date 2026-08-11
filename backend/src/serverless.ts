import "./loadEnv";
import { createNestApp } from "./app.nest";

let httpApp: any;

async function ensureInitialized() {
  if (!httpApp) {
    const nestApp = await createNestApp();
    httpApp = nestApp.httpApp;
    console.log("[vercel] NestJS API initialized");
  }
}

export default async (req: any, res: any) => {
  try {
    await ensureInitialized();
    return httpApp(req, res);
  } catch (err) {
    console.error("[vercel] Failed to initialize API:", err);
    if (!res.headersSent) {
      return res.status(503).json({ message: "API initialization failed" });
    }
    return res.end();
  }
};
