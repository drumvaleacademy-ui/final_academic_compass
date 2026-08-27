/**
 * REST sync layer for mark entries, timetable slots, conflicts, and full school snapshots.
 * Offline-first: local store is authoritative for reads; writes push to /api/*.
 */
import { api } from "./api";

export interface RemoteMarkEntry {
  id: string;
  curriculum_id: string;
  sheet_id: string;
  student_id: string;
  score: number | null;
  updated_by: string | null;
  device_name: string | null;
  version: number;
  updated_at: string;
}

export interface RemoteTimetableSlot {
  id: string;
  curriculum_id: string;
  class_id: string;
  stream_id: string | null;
  day_of_week: number;
  period: number;
  start_time: string | null;
  end_time: string | null;
  subject_id: string | null;
  teacher_id: string | null;
  room: string | null;
  version: number;
  updated_by: string | null;
  device_name: string | null;
  updated_at: string;
}

export interface RemoteConflict {
  id: string;
  entity: string;
  entity_id: string;
  field: string;
  server_value: string | null;
  incoming_value: string | null;
  incoming_by: string | null;
  incoming_device: string | null;
  status: "pending" | "resolved";
  resolution: string | null;
  custom_value: string | null;
  created_at: string;
}

export interface SchoolSnapshot {
  students: any[];
  teachers: any[];
  classes: any[];
  streams: any[];
  subjects: any[];
  exams: any[];
  sheets: any[];
  curricula: any[];
  entries: any[];
  timetable: any[];
  settings: any;
  classRemarks: any[];
  principalRemarks: any[];
  deletedIds: string[];
}

export async function pushMarkEntries(locals: Array<{
  id: string;
  curriculumId: string;
  sheetId: string;
  studentId: string;
  score: number | null;
  version: number;
  deviceName: string;
}>): Promise<Array<{ id: string; status: "ok" | "conflict" | "error" }>> {
  try {
    const result = await api.post<{ results: Array<{ id: string; status: "ok" | "conflict" }> }>("/v2/marks/batch", {
      entries: locals.map(l => ({
        id: l.id,
        curriculum_id: l.curriculumId,
        sheet_id: l.sheetId,
        student_id: l.studentId,
        score: l.score,
        version: l.version,
        device_name: l.deviceName,
      })),
    });
    return result.results.map(r => ({ ...r, status: r.status as "ok" | "conflict" | "error" }));
  } catch {
    return locals.map(l => ({ id: l.id, status: "error" }));
  }
}

export async function pushMarkEntry(local: {
  id: string;
  curriculumId: string;
  sheetId: string;
  studentId: string;
  score: number | null;
  version: number;
  deviceName: string;
}): Promise<"ok" | "conflict" | "error"> {
  const results = await pushMarkEntries([local]);
  return results[0]?.status ?? "error";
}

export async function fetchAllMarkEntries(): Promise<RemoteMarkEntry[]> {
  try {
    return await api.get<RemoteMarkEntry[]>("/v2/marks");
  } catch {
    return [];
  }
}

export async function fetchAllTimetableSlots(): Promise<RemoteTimetableSlot[]> {
  try {
    return await api.get<RemoteTimetableSlot[]>("/v2/timetable");
  } catch {
    return [];
  }
}

export async function fetchPendingConflicts(): Promise<RemoteConflict[]> {
  try {
    return await api.get<RemoteConflict[]>("/v2/conflicts?status=pending");
  } catch {
    return [];
  }
}

export async function resolveRemoteConflict(
  id: string,
  resolution: "server" | "this" | "custom",
  customValue?: string
) {
  await api.patch(`/v2/conflicts/${encodeURIComponent(id)}`, {
    resolution,
    custom_value: customValue ?? null,
  });
}

export async function pushTimetableSlots(locals: Array<RemoteTimetableSlot & { _isNew?: boolean }>): Promise<Array<{ id: string; status: "ok" | "conflict" | "error" | "forbidden" }>> {
  try {
    const result = await api.post<{ results: Array<{ id: string; status: "ok" | "conflict" }> }>("/v2/timetable/batch", {
      slots: locals.map(l => ({
        id: l.id,
        curriculum_id: l.curriculum_id,
        class_id: l.class_id,
        stream_id: l.stream_id ?? null,
        day_of_week: l.day_of_week,
        period: l.period,
        start_time: l.start_time ?? null,
        end_time: l.end_time ?? null,
        subject_id: l.subject_id ?? null,
        teacher_id: l.teacher_id ?? null,
        room: l.room ?? null,
        version: l.version,
        device_name: l.device_name,
        updated_at: l.updated_at,
      })),
    });
    return result.results.map(r => ({ ...r, status: r.status as "ok" | "conflict" | "error" | "forbidden" }));
  } catch {
    return locals.map(l => ({ id: l.id, status: "error" }));
  }
}

export async function pushTimetableSlot(
  local: RemoteTimetableSlot & { _isNew?: boolean }
): Promise<"ok" | "conflict" | "error" | "forbidden"> {
  const results = await pushTimetableSlots([local]);
  return results[0]?.status ?? "error";
}

export async function deleteTimetableSlot(id: string) {
  await api.delete(`/v2/timetable/${encodeURIComponent(id)}`);
}

export async function pushSchoolSnapshot(local: SchoolSnapshot): Promise<"ok" | "error"> {
  try {
    await api.post("/v2/sync", local);
    return "ok";
  } catch (err) {
    console.error("Save details sync failed:", err);
    // Rethrow so callers can show a useful message instead of a generic toast
    throw err;
  }
}

export async function fetchSchoolSnapshot(): Promise<SchoolSnapshot | null> {
  try {
    const result = await api.get<{ data: SchoolSnapshot | null }>("/v2/sync");
    const snapshot = result.data;
    if (!snapshot) return null;

    const classes = (snapshot.classes ?? []).map((item: any) => ({
      ...item,
      curriculumId: String(item.curriculumId ?? "cbc").trim().toLowerCase(),
    }));
    const classCurricula = new Map(classes.map((item: any) => [item.id, item.curriculumId]));
    return {
      ...snapshot,
      curricula: (snapshot.curricula ?? []).map((item: any) => ({ ...item, id: String(item.id ?? "").trim().toLowerCase() })),
      classes,
      streams: (snapshot.streams ?? []).map((item: any) => ({ ...item, classId: String(item.classId ?? "") })),
      students: (snapshot.students ?? []).map((item: any) => ({
        ...item,
        curriculumId: String(item.curriculumId ?? classCurricula.get(item.classId) ?? "cbc").trim().toLowerCase(),
      })),
      subjects: (snapshot.subjects ?? []).map((item: any) => ({ ...item, curriculumId: String(item.curriculumId ?? "cbc").trim().toLowerCase() })),
      exams: (snapshot.exams ?? []).map((item: any) => ({ ...item, curriculumId: String(item.curriculumId ?? "cbc").trim().toLowerCase() })),
      sheets: (snapshot.sheets ?? []).map((item: any) => ({ ...item, curriculumId: String(item.curriculumId ?? "cbc").trim().toLowerCase() })),
    };
  } catch (err) {
    console.error("Load school snapshot failed:", err);
    return null;
  }
}
