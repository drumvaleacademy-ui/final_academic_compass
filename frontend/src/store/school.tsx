import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export interface GradeBand {
  grade: string;
  min: number;
  max: number;
}

export interface Curriculum {
  id: string;
  name: string;
  shortName: string;
  description: string;
  gradingScale?: GradeBand[];
}

export interface ClassItem {
  id: string;
  curriculumId: string;
  name: string;
  classTeacherId?: string;
}

export interface StreamItem {
  id: string;
  classId: string;
  name: string;
}

export interface SubjectItem {
  id: string;
  curriculumId: string;
  name: string;
  code: string;
  teacherId?: string;
}

export interface TeacherItem {
  id: string;
  name: string;
  email?: string;
  curriculumIds: string[];
  role?: string;
}

export interface StudentItem {
  id: string;
  curriculumId: string;
  admissionNo: string;
  name: string;
  gender: "M" | "F";
  classId: string;
  streamId: string;
  vap?: string;
}

export interface ExamItem {
  id: string;
  curriculumId: string;
  name: string;
  term: 1 | 2 | 3;
  year: number;
  outOf: number;
  status: "draft" | "open" | "closed";
}

export interface SheetItem {
  id: string;
  curriculumId: string;
  classId: string;
  streamId: string;
  subjectId: string;
  examId: string;
  status: string;
  locked: boolean;
  updatedAt?: number;
  teacherComment?: string;
  teacherId?: string;
}

export interface EntryItem {
  id: string;
  sheetId: string;
  studentId: string;
  score: number | null;
  updatedAt: number;
  updatedBy?: string;
  pending: boolean;
}

export interface TimetableItem {
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

export interface ConflictItem {
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
}

export interface SchoolSettings {
  schoolName: string;
  academicYear: number;
}

export interface SchoolState {
  curricula: Curriculum[];
  activeCurriculum: string;
  classes: ClassItem[];
  streams: StreamItem[];
  subjects: SubjectItem[];
  teachers: TeacherItem[];
  students: StudentItem[];
  exams: ExamItem[];
  sheets: SheetItem[];
  entries: EntryItem[];
  timetable: TimetableItem[];
  conflicts: any[];
  settings: SchoolSettings;
  online: boolean;
  lastSyncAt: string | null;
  syncQueue: string[];
  deviceName: string;
  deletedIds: string[];
}

interface SchoolContextValue {
  state: SchoolState;
  activeCurriculum: string;
  setActiveCurriculum: (id: string) => void;
  update: (fn: (s: SchoolState) => void) => void;
  setMarkScore: (studentId: string, subjectId: string, raw: string) => void;
  syncNow: () => void;
  upsertTimetableSlot: (slot: TimetableItem) => void;
  removeTimetableSlot: (id: string) => void;
  resolveConflict: (id: string, resolution: string | undefined, customValue?: string | undefined) => void;
  bulkResolveConflicts: (resolution: string) => void;
}

const defaultState: SchoolState = {
  curricula: [
    { id: "cbc", name: "CBC", shortName: "CBC", description: "Competency-Based Curriculum" },
    { id: "844", name: "844", shortName: "844", description: "8-4-4 System" },
  ],
  activeCurriculum: "cbc",
  classes: [],
  streams: [],
  subjects: [],
  teachers: [],
  students: [],
  exams: [],
  sheets: [],
  entries: [],
  timetable: [],
  conflicts: [],
  settings: { schoolName: "Academic Compass School", academicYear: new Date().getFullYear() },
  online: typeof navigator !== "undefined" ? navigator.onLine : true,
  lastSyncAt: null,
  syncQueue: [],
  deviceName: "web",
  deletedIds: [],
};

const Ctx = createContext<SchoolContextValue>({
  state: defaultState,
  activeCurriculum: "cbc",
  setActiveCurriculum: () => {},
  update: () => {},
  setMarkScore: () => {},
  syncNow: () => {},
  upsertTimetableSlot: () => {},
  removeTimetableSlot: () => {},
  resolveConflict: () => {},
  bulkResolveConflicts: () => {},
});

export function SchoolProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SchoolState>(defaultState);

  const update = useCallback((fn: (s: SchoolState) => void) => {
    setState((prev) => {
      const next = { ...prev };
      fn(next);
      return next;
    });
  }, []);

  const setActiveCurriculum = useCallback((id: string) => {
    setState((prev) => ({ ...prev, activeCurriculum: id }));
  }, []);

  const value: SchoolContextValue = {
    state,
    activeCurriculum: state.activeCurriculum,
    setActiveCurriculum,
    update,
    setMarkScore: () => {},
    syncNow: () => {},
    upsertTimetableSlot: () => {},
    removeTimetableSlot: () => {},
    resolveConflict: () => {},
    bulkResolveConflicts: () => {},
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSchool() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSchool must be used within SchoolProvider");
  return ctx;
}
