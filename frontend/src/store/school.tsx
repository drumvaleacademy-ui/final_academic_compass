import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { pushSchoolSnapshot, fetchSchoolSnapshot, fetchPendingConflicts, resolveRemoteConflict } from "@/lib/syncService";
import { toast } from "sonner";

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
  exams: [],
  sheets: [],
  entries: [],
  timetable: [],
  conflicts: [],
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
  saveDetails: async () => {},
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
    syncNow: async () => {
      // simple sync: push full snapshot for now
      try {
        const snap = {
          students: state.students,
          teachers: state.teachers,
          classes: state.classes,
          streams: state.streams,
          subjects: state.subjects,
          exams: state.exams,
          sheets: state.sheets,
          curricula: state.curricula,
          settings: state.settings,
          classRemarks: [],
          principalRemarks: [],
          deletedIds: state.deletedIds,
        };
        const res = await pushSchoolSnapshot(snap);
        if (res === "ok") {
          setState(prev => ({ ...prev, lastSyncAt: new Date().toISOString(), syncQueue: [] }));
          toast.success("Sync successful");
        } else {
          toast.error("Sync failed");
        }
      } catch (err) {
        toast.error("Sync failed");
      }
    },
    upsertTimetableSlot: (slot: TimetableItem) => {
      setState(prev => {
        const next = { ...prev };
        const idx = next.timetable.findIndex(t => t.id === slot.id);
        if (idx >= 0) next.timetable[idx] = slot;
        else next.timetable.push(slot);
        return next;
      });
    },
    removeTimetableSlot: (id: string) => {
      setState(prev => ({ ...prev, timetable: prev.timetable.filter(t => t.id !== id) }));
    },
    resolveConflict: async (id: string, resolution: string | undefined, customValue?: string) => {
      try {
        await resolveRemoteConflict(id, (resolution as any) || "server", customValue);
        setState(prev => ({ ...prev, conflicts: prev.conflicts.map(c => c.id === id ? { ...c, status: "resolved", resolution: resolution ?? "server", customValue } : c) }));
        toast.success("Conflict resolved");
      } catch (err) {
        toast.error("Failed to resolve conflict");
      }
    },
    bulkResolveConflicts: async (resolution: string) => {
      const pending = state.conflicts.filter(c => c.status === "pending");
      for (const c of pending) {
        try {
          await resolveRemoteConflict(c.id, resolution as any);
        } catch {}
      }
      setState(prev => ({ ...prev, conflicts: prev.conflicts.map(c => c.status === "pending" ? { ...c, status: "resolved", resolution } : c) }));
      toast.success("Bulk conflict resolution submitted");
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

      try {
        const snap = {
          students: state.students,
          teachers: state.teachers,
          classes: state.classes,
          streams: state.streams,
          subjects: state.subjects,
          exams: state.exams,
          sheets: state.sheets,
          curricula: state.curricula,
          settings: state.settings,
          classRemarks: [],
          principalRemarks: [],
          deletedIds: state.deletedIds,
        };
        const res = await pushSchoolSnapshot(snap);
        if (res === "ok") {
          // After a successful push, fetch authoritative snapshot from server
          try {
            const server = await fetchSchoolSnapshot();
            if (server) {
              setState(prev => ({
                ...prev,
                students: server.students ?? prev.students,
                teachers: server.teachers ?? prev.teachers,
                classes: server.classes ?? prev.classes,
                streams: server.streams ?? prev.streams,
                subjects: server.subjects ?? prev.subjects,
                exams: server.exams ?? prev.exams,
                sheets: server.sheets ?? prev.sheets,
                curricula: server.curricula ?? prev.curricula,
                settings: server.settings ?? prev.settings,
                deletedIds: server.deletedIds ?? prev.deletedIds,
                lastSyncAt: new Date().toISOString(),
              }));
              toast.success("Details saved and refreshed from server");
            } else {
              setState(prev => ({ ...prev, lastSyncAt: new Date().toISOString() }));
              toast.success("Details saved");
            }
          } catch (err) {
            // If fetching snapshot failed, still mark saved and inform user
            setState(prev => ({ ...prev, lastSyncAt: new Date().toISOString() }));
            const message = err instanceof Error ? err.message : "Saved but failed to refresh from server";
            toast.success("Details saved");
            toast.error(message);
          }
        } else {
          toast.error("Failed to save details. Check your connection and sign-in status.");
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to save details.";
        toast.error(message);
      }
    },
  };

  // listen to online/offline events and refresh conflicts when online
  useEffect(() => {
    const onOnline = async () => {
      setState(prev => ({ ...prev, online: true }));
      try {
        const conflicts = await fetchPendingConflicts();
        setState(prev => ({ ...prev, conflicts }));
      } catch {}
    };
    const onOffline = () => setState(prev => ({ ...prev, online: false }));
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    // initial fetch when starting online
    if (state.online) {
      (async () => {
        try {
          const conflicts = await fetchPendingConflicts();
          setState(prev => ({ ...prev, conflicts }));
        } catch {}
      })();
    }
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSchool() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSchool must be used within SchoolProvider");
  return ctx;
}
