import { useSchool } from "@/store/school";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Search, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Classes() {
  const { state, activeCurriculum, update, saveDetails } = useSchool();
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState<{ entity: "class" | "stream"; id: string; label: string } | null>(null);
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
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => addStream(c.id)}><Plus className="h-3 w-3 mr-1"/>Stream</Button>
              </div>
            </Card>
          );
        })}
        {classes.length === 0 && <Card className="p-6 md:p-8 text-center text-muted-foreground">No classes yet</Card>}
      </div>

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
