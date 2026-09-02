import { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from "react";
import { useSchoolDataQuery } from "@/lib/schoolDataClient";
import { useInvalidateSchoolData } from "@/lib/schoolDataClient";
import { api } from "@/lib/api";
import { useAuth } from "@/store/auth";
import { toast } from "sonner";
import { normalizeCurriculumId } from "@/lib/schoolData";

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
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
}

export interface ParentItem {
  id: string;
  fullName: string;
  email?: string;
  relationship?: string;
  phoneNumbers: string[];
  studentIds: string[];
}

export interface ExamItem {
  id: string;
  curriculumId: string;
  name: string;
  term: 1 | 2 | 3;
  year: number;
  outOf: number;
  status: "draft" | "open" | "closed";
  startDate?: string;
  endDate?: string;
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

export interface SchoolSettings {
  schoolName: string;
  schoolTag: string;
  schoolAddress: string;
  schoolEmail: string;
  schoolWebsite: string;
  schoolMotto: string;
  schoolVision: string;
  schoolMission: string;
  principalName: string;
  principalTitle: string;
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
  parents: ParentItem[];
  exams: ExamItem[];
  sheets: SheetItem[];
  entries: EntryItem[];
  timetable: TimetableItem[];
  settings: SchoolSettings;
  online: boolean;
}

interface SchoolContextValue {
  state: SchoolState;
  activeCurriculum: string;
  setActiveCurriculum: (id: string) => void;
  update: (fn: (s: SchoolState) => void, options?: { markDirty?: boolean }) => void;
  setMarkScore: (studentId: string, subjectId: string, raw: string) => void;
  upsertTimetableSlot: (slot: TimetableItem) => void;
  removeTimetableSlot: (id: string) => void;
  saveMarks: () => Promise<void>;
  saveDetails: () => Promise<void>;
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
  parents: [],
  exams: [],
  sheets: [],
  entries: [],
  timetable: [],
  settings: {
    schoolName: "DRUMVALE SECONDARY SCHOOL",
    schoolTag: import.meta.env.VITE_SCHOOL_TAG ?? "Drumvale Academy - Academic Compass",
    schoolAddress: "P.O. BOX 99-00520 RUAI-NAIROBI, TEL: 0704 921 291",
    schoolEmail: "info@drumvalesecondary.com",
    schoolWebsite: "http://www.drumvalesecondary.com",
    schoolMotto: "Excellence is our commitment",
    schoolVision: "To empower all students to unlock and achieve their full potential",
    schoolMission: "To provide quality educational service that inspires all students to realize their aspirations; guided by the value of Godliness, self-discipline, commitment, fairness and focus on continuous improvement with excellence as the performance benchmark.",
    principalName: "SIMON MWANGI",
    principalTitle: "PRINCIPAL / BOM SECRETARY",
    academicYear: new Date().getFullYear(),
  },
  online: typeof navigator !== "undefined" ? navigator.onLine : true,
};

function cachedState(userId: string | undefined): SchoolState {
  if (!userId || typeof window === "undefined") return defaultState;
  try {
    const cached = JSON.parse(localStorage.getItem(`ac_school_draft_${userId}`) || "null");
    return cached ? { ...defaultState, ...cached } : defaultState;
  } catch {
    return defaultState;
  }
}

const Ctx = createContext<SchoolContextValue>({
  state: defaultState,
  activeCurriculum: "cbc",
  setActiveCurriculum: () => {},
  update: () => {},
  setMarkScore: () => {},
  upsertTimetableSlot: () => {},
  removeTimetableSlot: () => {},
  saveMarks: async () => {},
  saveDetails: async () => {},
});

export function SchoolProvider({ children }: { children: ReactNode }) {
  const { session, loading: authLoading } = useAuth();
  const [state, setState] = useState<SchoolState>(() => cachedState(session?.user.id));
  const schoolDataQuery = useSchoolDataQuery(!authLoading && !!session);
  const invalidateSchoolData = useInvalidateSchoolData();
  const stateRef = useRef(state);
  const localChangesRef = useRef(false);
  stateRef.current = state;

  const cacheSnapshot = (userId: string | undefined, snapshot: unknown) => {
    if (!userId || typeof window === "undefined") return;
    try { localStorage.setItem(`ac_school_draft_${userId}`, JSON.stringify(snapshot)); } catch (_e) {}
  };

  const update = useCallback((fn: (s: SchoolState) => void, options?: { markDirty?: boolean }) => {
    if (options?.markDirty !== false) localChangesRef.current = true;
    const next = { ...stateRef.current };
    fn(next);
    stateRef.current = next;
    setState(next);
  }, []);

  const setActiveCurriculum = useCallback((id: string) => {
    setState((prev) => ({ ...prev, activeCurriculum: normalizeCurriculumId(id) }));
  }, []);

  const value: SchoolContextValue = {
    state,
    activeCurriculum: state.activeCurriculum,
    setActiveCurriculum,
    update,
    setMarkScore: () => {},
    upsertTimetableSlot: async (slot: TimetableItem) => {
      setState(prev => {
        const next = { ...prev };
        const idx = next.timetable.findIndex(t => t.id === slot.id);
        if (idx >= 0) next.timetable[idx] = slot;
        else next.timetable.push(slot);
        return next;
      });
      try {
        await api.post("/v2/timetable", {
          id: slot.id,
          classId: slot.classId,
          streamId: slot.streamId,
          dayOfWeek: slot.dayOfWeek,
          period: slot.period,
          startTime: slot.startTime ?? "",
          endTime: slot.endTime ?? "",
          subjectId: slot.subjectId,
          teacherId: slot.teacherId,
          room: slot.room,
        });
        invalidateSchoolData();
      } catch (error) {
        await schoolDataQuery.refetch();
        toast.error(error instanceof Error ? error.message : "Failed to save timetable slot.");
      }
    },
    removeTimetableSlot: async (id: string) => {
      setState(prev => ({ ...prev, timetable: prev.timetable.filter(t => t.id !== id) }));
      try {
        await api.delete(`/v2/timetable/${encodeURIComponent(id)}`);
        invalidateSchoolData();
      } catch (error) {
        await schoolDataQuery.refetch();
        toast.error(error instanceof Error ? error.message : "Failed to remove timetable slot.");
      }
    },
    saveMarks: async () => {
      const entries = stateRef.current.entries.filter((entry) => entry.pending);
      if (!entries.length) return;
      try {
        await api.post("/v2/marks/batch", {
          entries: entries.map((entry) => ({ id: entry.id, sheetId: entry.sheetId, studentId: entry.studentId, score: entry.score })),
        });
        setState(prev => ({ ...prev, entries: prev.entries.map(entry => entry.pending ? { ...entry, pending: false } : entry) }));
        invalidateSchoolData();
        toast.success(`${entries.length} mark${entries.length === 1 ? "" : "s"} saved`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to save marks.");
      }
    },
    saveDetails: async () => {
      if (!confirm("Save current details to server? This will push students, classes, subjects, teachers, exams, sheets and timetable.")) return;

      const hasToken = typeof window !== "undefined" && !!localStorage.getItem("ac_token");
      if (!hasToken) {
        toast.error("Sign in before saving details.");
        return;
      }

      if (!state.online) {
        toast.error("You are offline. Save details when internet is available.");
        return;
      }

      let saveToast: string | number | undefined;
      try {
        saveToast = toast.loading("Saving details...");
        const snap = {
          students: state.students,
          teachers: state.teachers,
          classes: state.classes,
          streams: state.streams,
          subjects: state.subjects,
          exams: state.exams,
          sheets: state.sheets,
          entries: state.entries,
          timetable: state.timetable,
          curricula: state.curricula,
          settings: state.settings,
          classRemarks: [],
          principalRemarks: [],
        };

        if (typeof window !== "undefined" && session?.user.id) {
          localStorage.setItem(`ac_school_draft_${session.user.id}`, JSON.stringify(snap));
        }

        localChangesRef.current = false;
        cacheSnapshot(session?.user.id, snap);
        setState(prev => ({ ...prev }));
        toast.success("Details saved locally", { id: saveToast });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to save details.";
        toast.error(message, { id: saveToast });
      }
    },
  };

  useEffect(() => {
    const onOnline = () => {
      setState(prev => ({ ...prev, online: true }));
    };
    const onOffline = () => setState(prev => ({ ...prev, online: false }));
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [authLoading, session?.token, state.online]);

  useEffect(() => {
    const server = schoolDataQuery.data;
    if (!server || localChangesRef.current) return;
    cacheSnapshot(session?.user.id, server);
    setState(prev => ({
      ...prev,
      students: server.students ?? prev.students,
      teachers: server.teachers ?? prev.teachers,
      classes: server.classes ?? prev.classes,
      streams: server.streams ?? prev.streams,
      subjects: server.subjects ?? prev.subjects,
      exams: server.exams ?? prev.exams,
      sheets: server.sheets ?? prev.sheets,
      entries: server.entries ?? prev.entries,
      timetable: server.timetable ?? prev.timetable,
      curricula: server.curricula ?? prev.curricula,
      settings: server.settings ?? prev.settings,
    }));
  }, [schoolDataQuery.data, session?.user.id]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSchool() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSchool must be used within SchoolProvider");
  return ctx;
}
