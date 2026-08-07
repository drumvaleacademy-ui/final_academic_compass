import { Router } from "express";
import { authenticateJWT, requireRoles } from "./auth";
import { z } from "zod";
import { getStore } from "../lib/store";

const router = Router();
const editableMarkRoles = ["admin", "principal", "senior_teacher", "teacher", "subject_teacher"];

const markEntrySchema = z.object({
  id: z.string().min(1),
  curriculum_id: z.enum(["cbc", "844"]),
  sheet_id: z.string().min(1),
  student_id: z.string().min(1),
  score: z.number().min(0).max(100).nullable(),
  version: z.number().int().positive().optional(),
  device_name: z.string().trim().max(120).optional(),
});

function validationError(error: z.ZodError) {
  return {
    message: "Invalid request body",
    issues: error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })),
  };
}

router.get("/", authenticateJWT, async (_req, res) => {
  try {
    const rows = await (await getStore()).listMarkEntries();
    return res.json(rows.map((r) => ({
      id: r.id,
      curriculum_id: r.curriculumId,
      sheet_id: r.sheetId,
      student_id: r.studentId,
      score: r.score,
      updated_by: r.updatedBy,
      device_name: r.deviceName,
      version: r.version,
      updated_at: r.updatedAt.toISOString(),
    })));
  } catch (err) {
    console.error("[mark-entries GET]", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/", authenticateJWT, requireRoles(...editableMarkRoles), async (req: any, res) => {
  try {
    const parsed = markEntrySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(validationError(parsed.error));
    const { id, curriculum_id, sheet_id, student_id, score, version, device_name } = parsed.data;
    const status = await (await getStore()).upsertMarkEntry({
      id,
      curriculumId: curriculum_id,
      sheetId: sheet_id,
      studentId: student_id,
      score,
      version,
      userId: req.userId,
      deviceName: device_name ?? null,
    });
    return res.json({ status });
  } catch (err) {
    console.error("[mark-entries POST]", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

const batchMarkEntrySchema = z.object({
  entries: z.array(markEntrySchema).min(1),
});

router.post("/batch", authenticateJWT, requireRoles(...editableMarkRoles), async (req: any, res) => {
  try {
    const parsed = batchMarkEntrySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(validationError(parsed.error));
    const results = await (await getStore()).upsertMarkEntries(
      parsed.data.entries.map((e) => ({
        id: e.id,
        curriculumId: e.curriculum_id,
        sheetId: e.sheet_id,
        studentId: e.student_id,
        score: e.score,
        version: e.version,
        userId: req.userId,
        deviceName: e.device_name ?? null,
      }))
    );
    return res.json({ results });
  } catch (err) {
    console.error("[mark-entries BATCH]", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
