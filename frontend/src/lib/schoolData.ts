export const DEPARTMENTS = [
  "Mathematics",
  "English",
  "Kiswahili",
  "Science",
  "Social Studies",
  "Religious Education",
  "Creative Arts",
  "Physical Education",
  "Computer Studies",
  "Agriculture",
  "Business Studies",
  "Home Science",
];

export type SheetStatus = "draft" | "open" | "closed";
export type ID = string;
export type CurriculumId = "cbc" | "844";

export function normalizeCurriculumId(value: unknown): string {
  return String(value ?? "cbc").trim().toLowerCase();
}

export function belongsToCurriculum(value: unknown, selected: string): boolean {
  return normalizeCurriculumId(value) === normalizeCurriculumId(selected);
}

export interface MarkEntry {
  id: string;
  sheetId: string;
  studentId: string;
  score: number | null;
  updatedAt: number;
  updatedBy?: string;
  pending: boolean;
}

export interface TimetableSlot {
  id: string;
  curriculumId: string;
  classId: string;
  streamId?: string;
  dayOfWeek: number;
  period: number;
  startTime?: string;
  endTime?: string;
  subjectId?: string;
  teacherId?: string;
  room?: string;
  pending?: boolean;
}

export interface SyncConflict {
  id: string;
  entity: string;
  entityId: string;
  field: string;
  server_value?: string;
  incoming_value?: string;
  incoming_by?: string;
  incoming_device?: string;
  status: string;
  resolution?: string;
  custom_value?: string;
  created_at: string;
  resolved_at?: string;
  studentId?: string;
  subjectId?: string;
  examId?: string;
  classId?: string;
  streamId?: string;
  deviceName?: string;
  thisDeviceValue?: string;
  otherDeviceValue?: string;
  otherDeviceName?: string;
  timestamp?: number;
  editedBy?: string;
  serverValue?: string;
  customValue?: string;
}

export interface GradeBand {
  grade: string;
  shortForm?: string;
  min: number;
  max: number;
}

export const CBC_GRADE_BANDS: GradeBand[] = [
  { grade: "Exceeding Expectation", shortForm: "EE", min: 80, max: 100 },
  { grade: "Meeting Expectation", shortForm: "ME", min: 60, max: 79 },
  { grade: "Approaching Expectation", shortForm: "AE", min: 40, max: 59 },
  { grade: "Below Expectation", shortForm: "BE", min: 0, max: 39 },
];

export const EIGHT_FOUR_FOUR_GRADE_BANDS: GradeBand[] = [
  { grade: "A", shortForm: "A", min: 80, max: 100 },
  { grade: "B", shortForm: "B", min: 65, max: 79 },
  { grade: "C", shortForm: "C", min: 50, max: 64 },
  { grade: "D", shortForm: "D", min: 35, max: 49 },
  { grade: "E", shortForm: "E", min: 0, max: 34 },
];

export function getCurriculumGradeScale(curriculumId?: string | null): GradeBand[] {
  const normalized = normalizeCurriculumId(curriculumId ?? "cbc");
  return normalized === "844" ? EIGHT_FOUR_FOUR_GRADE_BANDS : CBC_GRADE_BANDS;
}

export function gradeFor(score: number | null, scale?: GradeBand[] | string): GradeBand | null {
  if (score == null) return null;
  const resolvedScale = typeof scale === "string" ? getCurriculumGradeScale(scale) : (scale ?? getCurriculumGradeScale("cbc"));
  const band = resolvedScale.find((b) => score >= b.min && score <= b.max);
  return band ?? null;
}

export interface StudentStats {
  total: number;
  count: number;
  average: number;
  mean?: number;
  overallGrade?: string;
  totalPoints?: number;
  rows?: Array<{ subject: string; score: number; grade: string; rank?: number; total?: number; deviation?: number }>;
}

export function statsForStudentExam(
  entries: MarkEntry[],
  studentId: string,
  subjects?: Array<{ id: string; name: string }>,
  sheets?: Array<{ id: string; subjectId: string; examId?: string }>,
  examId?: string
): StudentStats {
  const studentEntries = entries.filter((e) => {
    if (e.studentId !== studentId || e.score == null) return false;
    if (!examId) return true;
    return sheets?.some((sheet) => sheet.id === e.sheetId && sheet.examId === examId) ?? false;
  });
  const total = studentEntries.reduce((sum, e) => sum + (e.score ?? 0), 0);
  const count = studentEntries.length;
  const average = count > 0 ? total / count : 0;
  const rows = studentEntries.map((e) => {
    const sub = subjects?.find((s) => s.id === sheets?.find((sh) => sh.id === e.sheetId)?.subjectId);
    const grade = gradeFor(e.score ?? 0);
    return { subject: sub?.name ?? "Unknown", score: e.score ?? 0, grade: grade?.grade ?? "" };
  });
  return { total, count, average, mean: average, overallGrade: gradeFor(average)?.grade ?? "", totalPoints: 0, rows };
}

export function identifyWeakAreas(
  entries: MarkEntry[],
  subjects: Array<{ id: string; name: string }>,
  sheets: Array<{ id: string; subjectId: string }>
): Array<{ subject: string; average: number; latestScore?: number; reason?: string; trend?: string }> {
  return subjects.map((sub) => {
    const shs = sheets.filter((s) => s.subjectId === sub.id);
    const subEntries = entries.filter((e) => shs.some((s) => s.id === e.sheetId) && e.score != null);
    const avg = subEntries.length ? subEntries.reduce((a, b) => a + (b.score ?? 0), 0) / subEntries.length : 0;
    return { subject: sub.name, average: Math.round(avg * 10) / 10, latestScore: avg, reason: "", trend: "stable" };
  });
}

export function createMarkSheetsForExam(state: any, exam: any) {
  const sheets: any[] = [];
  const entries: any[] = [];
  return { sheets, entries };
}
