import { useMemo, useState } from "react";
import { useSchool } from "@/store/school";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, Unlock, Eye, BarChart3, Users } from "lucide-react";
import { Link } from "react-router-dom";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft:     { label: "Draft",     color: "text-gray-600",     bg: "bg-gray-100" },
  submitted: { label: "Submitted", color: "text-blue-600",     bg: "bg-blue-50" },
  approved:  { label: "Approved",  color: "text-purple-600",   bg: "bg-purple-50" },
  published: { label: "Published", color: "text-green-600",    bg: "bg-green-50" },
};

export default function MarkSheets() {
  const { state, activeCurriculum, update } = useSchool();
  const [examFilter, setExamFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const exams = useMemo(() => state.exams.filter(e => e.curriculumId === activeCurriculum), [state.exams, activeCurriculum]);

  let sheets = useMemo(() => state.sheets.filter(s => s.curriculumId === activeCurriculum), [state.sheets, activeCurriculum]);
  if (examFilter !== "all") sheets = sheets.filter(s => s.examId === examFilter);
  if (statusFilter !== "all") sheets = sheets.filter(s => s.status === statusFilter);
  if (search) {
    const q = search.toLowerCase();
    sheets = sheets.filter(s => {
      const sub = state.subjects.find(x => x.id === s.subjectId);
      const cls = state.classes.find(c => c.id === s.classId);
      const str = state.streams.find(st => st.id === s.streamId);
      const ex  = state.exams.find(e => e.id === s.examId);
      return (
        sub?.name.toLowerCase().includes(q) ||
        cls?.name.toLowerCase().includes(q) ||
        str?.name.toLowerCase().includes(q) ||
        ex?.name.toLowerCase().includes(q)
      );
    });
  }

  const setStatus = (id: string, status: string) => update(s => {
    const sh = s.sheets.find(x => x.id === id);
    if (sh) { sh.status = status as typeof sh.status; sh.updatedAt = Date.now(); }
  });

  const toggleLock = (id: string) => update(s => {
    const sh = s.sheets.find(x => x.id === id);
    if (sh) sh.locked = !sh.locked;
  });

  return (
    <div>
      <PageHeader
        title="Mark Sheets"
        description="Track exam sheet progress, lock/unlock, and manage status."
        actions={
          <Badge variant="secondary" className="text-xs">
            <BarChart3 className="h-3.5 w-3.5 mr-1"/>
            {sheets.length} sheet{sheets.length === 1 ? "" : "s"}
          </Badge>
        }
      />

      <Card className="p-4 md:p-5 mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[180px]">
            <label className="text-xs text-muted-foreground mb-1 block">Search</label>
            <Input
              placeholder="Search subject, class, exam..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Exam</label>
            <Select value={examFilter} onValueChange={setExamFilter}>
              <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder="All exams"/></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All exams</SelectItem>
                {exams.map(e => <SelectItem key={e.id} value={e.id}>{e.name} · T{e.term}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="Any status"/></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <div className="grid gap-3">
        {sheets.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground">
            <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-40"/>
            <p className="font-medium">No mark sheets found</p>
            <p className="text-xs mt-1">Create exams first, then mark sheets will be generated automatically.</p>
          </Card>
        )}

        {sheets.map(sh => {
          const sub     = state.subjects.find(x => x.id === sh.subjectId);
          const cls     = state.classes.find(c => c.id === sh.classId);
          const str     = state.streams.find(s => s.id === sh.streamId);
          const ex      = state.exams.find(e => e.id === sh.examId);
          const teacher = state.teachers.find(t => t.id === sh.teacherId);
          const entries = state.entries.filter(e => e.sheetId === sh.id);
          const filled  = entries.filter(e => e.score != null).length;
          const total   = entries.length;
          const progress = total > 0 ? Math.round((filled / total) * 100) : 0;
          const statusConf = STATUS_CONFIG[sh.status] || STATUS_CONFIG.draft;

          return (
            <Card key={sh.id} className="p-4 md:p-5 hover:shadow-md transition-shadow">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`h-10 w-10 rounded-lg grid place-items-center shrink-0 ${statusConf.bg} ${statusConf.color}`}>
                    <Eye className="h-5 w-5"/>
                  </div>
                  <div>
                    <div className="font-semibold text-sm md:text-base">
                      {sub?.name || "Unknown Subject"}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {cls?.name} · {str?.name} · {ex?.name}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <Badge variant="outline" className={`text-[10px] h-5 px-1.5 ${statusConf.bg} ${statusConf.color} border-current/20`}>
                        {statusConf.label}
                      </Badge>
                      {sh.locked && (
                        <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-red-50 text-red-600 border-red-200">
                          <Lock className="h-3 w-3 mr-1"/>Locked
                        </Badge>
                      )}
                      {!sh.locked && (
                        <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-green-50 text-green-600 border-green-200">
                          <Unlock className="h-3 w-3 mr-1"/>Open
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link to={`/entry?sheet=${sh.id}`}>
                      <Eye className="h-3.5 w-3.5 mr-1"/>Open
                    </Link>
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    title={sh.locked ? "Unlock" : "Lock"}
                    onClick={() => toggleLock(sh.id)}
                  >
                    {sh.locked ? <Unlock className="h-4 w-4 text-green-600"/> : <Lock className="h-4 w-4 text-muted-foreground"/>}
                  </Button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <div className="text-muted-foreground">Teacher</div>
                  <div className="font-medium mt-0.5 truncate">{teacher?.name || "—"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Progress</div>
                  <div className="font-medium mt-0.5">{filled}/{total} ({progress}%)</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Status</div>
                  <select
                    className="inline-edit h-7 text-xs mt-0.5 w-full max-w-[140px]"
                    value={sh.status}
                    onChange={(e) => setStatus(sh.id, e.target.value)}
                  >
                    <option value="draft">Draft</option>
                    <option value="submitted">Submitted</option>
                    <option value="approved">Approved</option>
                    <option value="published">Published</option>
                  </select>
                </div>
                <div>
                  <div className="text-muted-foreground">Updated</div>
                   <div className="font-medium mt-0.5">{new Date(sh.updatedAt ?? Date.now()).toLocaleDateString()}</div>
                </div>
              </div>

              <div className="mt-3">
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${progress === 100 ? "bg-green-500" : progress > 50 ? "bg-blue-500" : "bg-amber-500"}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="mt-3">
                <label className="text-[10px] uppercase text-muted-foreground font-semibold">Teacher Comment</label>
                <Input
                  className="mt-1 h-8 text-xs"
                  placeholder="Add a comment for this sheet…"
                  value={sh.teacherComment || ""}
                  onChange={(e) => update(s => { const x = s.sheets.find(x => x.id === sh.id); if (x) x.teacherComment = e.target.value; })}
                />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
