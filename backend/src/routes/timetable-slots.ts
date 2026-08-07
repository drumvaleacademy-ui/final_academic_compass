import { Router } from "express";
import { authenticateJWT, requireRoles } from "./auth";
import { z } from "zod";
import { getStore } from "../lib/store";

const router = Router();
const timetableEditRoles = ["admin", "principal", "senior_teacher"];

const timetableSlotSchema = z.object({
  id: z.string().min(1),
  curriculum_id: z.enum(["cbc", "844"]),
  class_id: z.string().min(1),
  stream_id: z.string().min(1).nullable().optional(),
  day_of_week: z.number().int().min(1).max(7),
  period: z.number().int().min(1).max(12),
  start_time: z.string().trim().max(20).nullable().optional(),
  end_time: z.string().trim().max(20).nullable().optional(),
  subject_id: z.string().min(1).nullable().optional(),
  teacher_id: z.string().min(1).nullable().optional(),
  room: z.string().trim().max(80).nullable().optional(),
  version: z.number().int().positive().optional(),
  device_name: z.string().trim().max(120).nullable().optional(),
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
    const rows = await (await getStore()).listTimetableSlots();
    return res.json(rows.map((r) => ({
      id: r.id,
      curriculum_id: r.curriculumId,
      class_id: r.classId,
      stream_id: r.streamId,
      day_of_week: r.dayOfWeek,
      period: r.period,
      start_time: r.startTime,
      end_time: r.endTime,
      subject_id: r.subjectId,
      teacher_id: r.teacherId,
      room: r.room,
      version: r.version,
      updated_by: r.updatedBy,
      device_name: r.deviceName,
      updated_at: r.updatedAt.toISOString(),
    })));
  } catch (err) {
    console.error("[timetable-slots GET]", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/", authenticateJWT, requireRoles(...timetableEditRoles), async (req: any, res) => {
  try {
    const parsed = timetableSlotSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(validationError(parsed.error));
    const {
      id, curriculum_id, class_id, stream_id, day_of_week, period, start_time, end_time,
      subject_id, teacher_id, room, version, device_name,
    } = parsed.data;
    const status = await (await getStore()).upsertTimetableSlot({
      id,
      curriculumId: curriculum_id,
      classId: class_id,
      streamId: stream_id ?? null,
      dayOfWeek: day_of_week,
      period,
      startTime: start_time ?? null,
      endTime: end_time ?? null,
      subjectId: subject_id ?? null,
      teacherId: teacher_id ?? null,
      room: room ?? null,
      version,
      userId: req.userId,
      deviceName: device_name ?? null,
    });
    return res.json({ status });
  } catch (err) {
    console.error("[timetable-slots POST]", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

const batchTimetableSlotSchema = z.object({
  slots: z.array(timetableSlotSchema).min(1),
});

router.post("/batch", authenticateJWT, requireRoles(...timetableEditRoles), async (req: any, res) => {
  try {
    const parsed = batchTimetableSlotSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(validationError(parsed.error));
    const results = await (await getStore()).upsertTimetableSlots(
      parsed.data.slots.map((s) => ({
        id: s.id,
        curriculumId: s.curriculum_id,
        classId: s.class_id,
        streamId: s.stream_id ?? null,
        dayOfWeek: s.day_of_week,
        period: s.period,
        startTime: s.start_time ?? null,
        endTime: s.end_time ?? null,
        subjectId: s.subject_id ?? null,
        teacherId: s.teacher_id ?? null,
        room: s.room ?? null,
        version: s.version,
        userId: req.userId,
        deviceName: s.device_name ?? null,
      }))
    );
    return res.json({ results });
  } catch (err) {
    console.error("[timetable-slots BATCH]", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/:id", authenticateJWT, requireRoles(...timetableEditRoles), async (req: any, res) => {
  try {
    await (await getStore()).deleteTimetableSlot(req.params.id);
    return res.json({ ok: true });
  } catch (err) {
    console.error("[timetable-slots DELETE]", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
