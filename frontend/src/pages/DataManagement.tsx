import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSchool } from "@/store/school";
import { Download, Upload, Save, Database, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function DataManagement() {
  const { state, saveDetails, syncNow } = useSchool();

  const exportLocalData = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      school: state.settings,
      curricula: state.curricula,
      classes: state.classes,
      streams: state.streams,
      subjects: state.subjects,
      teachers: state.teachers,
      students: state.students,
      exams: state.exams,
      sheets: state.sheets,
      entries: state.entries,
      timetable: state.timetable,
      deletedIds: state.deletedIds,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `academic-compass-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Backup exported");
  };

  const importLocalData = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const payload = JSON.parse(text);

        // Minimal restore: replace the current school state with a known-good backup payload.
        const next = {
          ...state,
          curricula: payload.curricula ?? state.curricula,
          classes: payload.classes ?? state.classes,
          streams: payload.streams ?? state.streams,
          subjects: payload.subjects ?? state.subjects,
          teachers: payload.teachers ?? state.teachers,
          students: payload.students ?? state.students,
          exams: payload.exams ?? state.exams,
          sheets: payload.sheets ?? state.sheets,
          entries: payload.entries ?? state.entries,
          timetable: payload.timetable ?? state.timetable,
          deletedIds: payload.deletedIds ?? state.deletedIds,
          settings: { ...state.settings, ...(payload.school ?? {}) },
        };

        localStorage.setItem(`ac_school_snapshot_${state.deviceName}`, JSON.stringify(next));
        window.location.reload();
        toast.success("Backup imported");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Invalid backup file");
      }
    };
    input.click();
  };

  const pendingCount = state.entries.filter((entry) => entry.pending).length;

  return (
    <div>
      <PageHeader
        title="Data Management"
        description="Keep the school data stable by saving locally, exporting backups, and uploading only validated payloads instead of using the fragile full snapshot sync path."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-primary/10 p-2 text-primary"><Save className="h-4 w-4" /></div>
            <div>
              <h2 className="font-semibold">Local save</h2>
              <p className="text-sm text-muted-foreground">Store working data in the current device.</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {pendingCount > 0 ? `${pendingCount} entries still pending local save.` : "No local pending entries."}
          </p>
          <Button onClick={() => syncNow()} className="w-full">Save local data</Button>
        </Card>

        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-emerald-500/10 p-2 text-emerald-600"><Download className="h-4 w-4" /></div>
            <div>
              <h2 className="font-semibold">Backup</h2>
              <p className="text-sm text-muted-foreground">Export a clean JSON backup file.</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Use this before any major import or data reset.</p>
          <Button variant="secondary" onClick={exportLocalData} className="w-full">Export backup</Button>
        </Card>

        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-amber-500/10 p-2 text-amber-600"><Upload className="h-4 w-4" /></div>
            <div>
              <h2 className="font-semibold">Restore</h2>
              <p className="text-sm text-muted-foreground">Import a previously exported backup.</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">This avoids the unstable full-school sync merge path.</p>
          <Button variant="outline" onClick={importLocalData} className="w-full">Import backup</Button>
        </Card>
      </div>

      <Card className="mt-6 p-5 border-amber-500/30 bg-amber-500/5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-700">Recommended direction</h3>
            <p className="text-sm text-muted-foreground mt-1">
              The old full snapshot sync is now replaced by per-module saves and explicit backup/restore flows. This keeps the app stable and avoids large merge failures caused by mismatched records or schema drift.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
