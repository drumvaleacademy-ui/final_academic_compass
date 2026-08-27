import { useSchool } from "@/store/school";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Search, X, Upload, Users } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { pushSchoolSnapshot } from "@/lib/syncService";
import * as XLSX from "xlsx";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Classes() {
  const { state, activeCurriculum, update, saveDetails } = useSchool();
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState<{ entity: "class" | "stream"; id: string; label: string } | null>(null);
    const [extractTarget, setExtractTarget] = useState<{ classId: string; streamId: string; label: string } | null>(null);
    const [extractRows, setExtractRows] = useState<{ admissionNo: string; name: string }[] | null>(null);
    const extractFileRef = useRef<HTMLInputElement>(null);
  const classes = state.classes.filter(c => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return c.curriculumId === activeCurriculum;
    return c.curriculumId === activeCurriculum && c.name.toLowerCase().includes(q);
  });
  const teachers = state.teachers.filter(t => t.curriculumIds.includes(activeCurriculum));

  const addClass = () => update((s) => {
    const existing = s.classes.filter((item) => item.curriculumId === activeCurriculum).length;
    const name = activeCurriculum === "cbc" ? `Grade ${existing + 1}` : `Form ${existing + 1}`;
    const id = `cls_${Date.now()}`;
    s.classes.push({ id, curriculumId: activeCurriculum, name });
    s.streams.push({ id: `str_${Date.now()}`, classId: id, name: "General" });
  });
  const addStream = (classId: string) => update((s) => {
    s.streams.push({ id: `str_${Date.now()}`, classId, name: "New Stream" });
  });

  const deleteEntity = async () => {
    if (!pendingDelete) return;
    const target = pendingDelete;
    try {
      await api.delete(`/v2/sync/entity/${target.entity}/${encodeURIComponent(target.id)}`);
      update(s => {
        if (target.entity === "class") {
          s.classes = s.classes.filter(item => item.id !== target.id);
          s.streams = s.streams.filter(item => item.classId !== target.id);
        } else {
          s.streams = s.streams.filter(item => item.id !== target.id);
        }
        s.deletedIds = (s.deletedIds ?? []).filter(item => item !== target.id);
      });
      toast.success(`${target.entity === "class" ? "Class" : "Stream"} deleted permanently.`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not delete this item.");
    } finally {
      setPendingDelete(null);
    }
  };

  const extractStudents = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !extractTarget) return;
    try {
      const workbook = XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: "" });
      if (!rawRows.length) throw new Error("The uploaded file is empty.");
      const first = rawRows[0].map((cell: any) => String(cell).trim().toLowerCase());
      const hasHeader = first.some(cell => /admission|adm|student|learner|pupil|name/.test(cell));
      const admissionIndex = hasHeader ? first.findIndex(cell => /admission|adm|student\s*(id|no|number)|learner\s*(id|no|number)|pupil\s*(id|no|number)/.test(cell)) : 0;
      const nameIndex = hasHeader ? first.findIndex(cell => /^(full\s*)?(student\s*)?name$|learner\s*name|pupil\s*name/.test(cell)) : 1;
      const rows = rawRows.slice(hasHeader ? 1 : 0).map(row => ({
        admissionNo: String(row[admissionIndex >= 0 ? admissionIndex : 0] ?? "").trim(),
        name: String(row[nameIndex >= 0 ? nameIndex : 1] ?? "").trim(),
      })).filter(row => row.admissionNo || row.name);
      if (!rows.length) throw new Error("No student names or admission numbers were found.");
      setExtractRows(rows);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not read the student file.");
    } finally {
      event.target.value = "";
    }
  };

  const confirmExtraction = async () => {
    if (!extractRows || !extractTarget) return;
    const existingKeys = new Set(state.students.map(student => `${student.classId}:${student.streamId}:${student.admissionNo.trim().toLowerCase()}`));
    const imported = extractRows.filter(row => {
      const identity = row.admissionNo.trim().toLowerCase() || `name:${row.name.trim().toLowerCase()}`;
      const key = `${extractTarget.classId}:${extractTarget.streamId}:${identity}`;
      if (existingKeys.has(key)) return false;
      existingKeys.add(key);
      return true;
    }).map((row, index) => ({
      id: `stu_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 7)}`,
      curriculumId: activeCurriculum,
      admissionNo: row.admissionNo || `PENDING/${state.settings.academicYear}/${index + 1}`,
      name: row.name || "New Student",
      gender: "M" as const,
      classId: extractTarget.classId,
      streamId: extractTarget.streamId,
      vap: "",
    }));
    if (!imported.length) {
      toast.error("All extracted students are already registered in this stream.");
      setExtractRows(null);
      return;
    }
    const snapshot = {
      students: [...state.students, ...imported], teachers: state.teachers, classes: state.classes,
      streams: state.streams, subjects: state.subjects, exams: state.exams, sheets: state.sheets,
      entries: state.entries, timetable: state.timetable, curricula: state.curricula, settings: state.settings,
      classRemarks: [], principalRemarks: [], deletedIds: state.deletedIds,
    };
    try {
      await pushSchoolSnapshot(snapshot);
      update(s => { s.students.push(...imported); });
      toast.success(`${imported.length} student${imported.length === 1 ? "" : "s"} extracted and saved to ${extractTarget.label}.`);
      setExtractRows(null);
      setExtractTarget(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Students could not be saved.");
    }
  };

  return (
    <div>
      <PageHeader
        title="Classes & Streams"
        description="Organize learners into classes and streams for this curriculum."
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search classes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 w-56"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <Button onClick={addClass}><Plus className="h-4 w-4 mr-1"/>Add class</Button>
            <Button variant="secondary" size="sm" onClick={() => saveDetails?.()}>Save details</Button>
          </div>
        }
      />

      <div className="grid gap-3">
        {classes.map((c) => {
          const streams = state.streams.filter(s => s.classId === c.id);
          const count = state.students.filter(s => s.classId === c.id).length;
          return (
            <Card key={c.id} className="p-3 md:p-4">
              <div className="flex items-center gap-3 flex-wrap">
                <input className="inline-edit text-lg font-semibold" value={c.name}
                  onChange={(e) => update(s => { const x = s.classes.find(x => x.id === c.id); if (x) x.name = e.target.value; })}/>
                <span className="text-xs text-muted-foreground">{count} students · {streams.length} streams</span>
                <div className="ml-auto flex items-center gap-2">
                  <label className="text-xs text-muted-foreground">Class teacher</label>
                  <select className="inline-edit text-sm" value={c.classTeacherId || ""}
                    onChange={(e) => update(s => { const x = s.classes.find(x => x.id === c.id); if (x) x.classTeacherId = e.target.value || undefined; })}>
                    <option value="">Unassigned</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  <Button variant="ghost" size="icon" aria-label={`Delete ${c.name}`} onClick={() => {
                    if (count > 0) { toast.error("This class still has students. Reassign them before deleting it."); return; }
                    setPendingDelete({ entity: "class", id: c.id, label: c.name });
                  }}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {streams.map((str) => (
                  <div key={str.id} className="flex items-center gap-1 rounded-md border px-2 py-1 text-sm bg-muted/40">
                    <input className="inline-edit w-24" value={str.name}
                      onChange={(e) => update(s => { const x = s.streams.find(x => x.id === str.id); if (x) x.name = e.target.value; })}/>
                     <Button variant="ghost" size="icon" className="h-6 w-6" aria-label={`Delete ${str.name}`} onClick={() => setPendingDelete({ entity: "stream", id: str.id, label: str.name })}>
                      <Trash2 className="h-3 w-3 text-destructive"/>
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" aria-label={`Extract students into ${str.name}`} onClick={() => { setExtractTarget({ classId: c.id, streamId: str.id, label: `${c.name} ${str.name}` }); extractFileRef.current?.click(); }}>
                      <Upload className="h-3 w-3 text-primary" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => addStream(c.id)}><Plus className="h-3 w-3 mr-1"/>Stream</Button>
              </div>
            </Card>
          );
        })}
        {classes.length === 0 && <Card className="p-6 md:p-8 text-center text-muted-foreground">No classes yet</Card>}
      </div>

      <input ref={extractFileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={extractStudents} />
      <AlertDialog open={extractRows !== null} onOpenChange={(open) => { if (!open) { setExtractRows(null); setExtractTarget(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Extract students</AlertDialogTitle>
            <AlertDialogDescription>Review {extractRows?.length ?? 0} rows for <strong>{extractTarget?.label}</strong>. Names and admission numbers will be saved now; missing fields can be completed later in Students.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-64 overflow-y-auto rounded-md border text-sm">
            {extractRows?.slice(0, 50).map((row, index) => <div key={`${row.admissionNo}-${index}`} className="grid grid-cols-2 gap-3 border-b px-3 py-2 last:border-0"><span>{row.name || "New Student"}</span><span className="font-mono text-muted-foreground">{row.admissionNo || "Generated later"}</span></div>)}
            {(extractRows?.length ?? 0) > 50 && <div className="px-3 py-2 text-xs text-muted-foreground">Showing first 50 rows.</div>}
          </div>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmExtraction}>Save extracted students</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => { if (!open) setPendingDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {pendingDelete?.entity}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes <strong>{pendingDelete?.label}</strong> from the database. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={deleteEntity}>Delete permanently</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
