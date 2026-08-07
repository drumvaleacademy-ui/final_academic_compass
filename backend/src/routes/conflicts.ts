import { Router } from "express";
import { authenticateJWT, requireRoles } from "./auth";
import { z } from "zod";
import { getStore } from "../lib/store";

const router = Router();
const conflictManagerRoles = ["admin", "principal", "senior_teacher"];

const conflictStatusSchema = z.enum(["pending", "resolved"]);
const resolveConflictSchema = z.object({
  resolution: z.enum(["server", "this", "custom"]),
  custom_value: z.string().trim().max(500).nullable().optional(),
});

function validationError(error: z.ZodError) {
  return {
    message: "Invalid request",
    issues: error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })),
  };
}

router.get("/", authenticateJWT, async (req, res) => {
  try {
    const parsedStatus = req.query.status === undefined
      ? undefined
      : conflictStatusSchema.safeParse(req.query.status);
    if (parsedStatus && !parsedStatus.success) {
      return res.status(400).json(validationError(parsedStatus.error));
    }
    const rows = await (await getStore()).listConflicts(parsedStatus?.data);
    return res.json(rows.map((r) => ({
      id: r.id,
      entity: r.entity,
      entity_id: r.entityId,
      field: r.field,
      server_value: r.serverValue,
      incoming_value: r.incomingValue,
      incoming_by: r.incomingBy,
      incoming_device: r.incomingDevice,
      status: r.status,
      resolution: r.resolution,
      custom_value: r.customValue,
      created_at: r.createdAt.toISOString(),
    })));
  } catch (err) {
    console.error("[conflicts GET]", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.patch("/:id", authenticateJWT, requireRoles(...conflictManagerRoles), async (req, res) => {
  try {
    const parsed = resolveConflictSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(validationError(parsed.error));
    const { resolution, custom_value } = parsed.data;
    await (await getStore()).resolveConflict(String(req.params.id), resolution, custom_value ?? null);
    return res.json({ ok: true });
  } catch (err) {
    console.error("[conflicts PATCH]", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
