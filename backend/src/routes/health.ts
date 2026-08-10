import { Router } from "express";

const router = Router();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
router.get("/", (_req: any, res: any) => {
  res.json({ status: "ok" });
});

export default router;
