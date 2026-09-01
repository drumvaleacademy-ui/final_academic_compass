import { useRef, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Trash2, Upload, X, Phone, Mail, UserRound, Users, ArrowUpDown } from "lucide-react";
import { useSchool } from "@/store/school";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { api } from "@/lib/api";

interface ParentDraft {
  id: string;
  fullName: string;
  email?: string;
  relationship?: string;
  phoneNumbers: string[];
  studentIds: string[];
}

interface StudentSelectorState {
  isOpen: boolean;
  parentId: string | null;
  query: string;
  sortBy: "name" | "admission" | "class";
}

export default function ParentsPage() {
  const { state, update } = useSchool();
  const [query, setQuery] = useState("");
  const [importRows, setImportRows] = useState<any[] | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [studentSelector, setStudentSelector] = useState<StudentSelectorState>({
    isOpen: false,
    parentId: null,
    query: "",
    sortBy: "name",
  });
  const inputRef = useRef<HTMLInputElement>(null);

  const parents = state.parents.filter((parent) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [parent.fullName, parent.email || "", parent.relationship || "", (parent.phoneNumbers || []).join(", ")]
      .join(" ")
      .toLowerCase()
      .includes(q);
  });

  const selectedParent = selectedParentId ? state.parents.find(p => p.id === selectedParentId) : null;

  const createEmptyParent = () => {
    const newParent = {
      id: `par_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      fullName: "New Parent",
      email: "",
      relationship: "Parent",
      phoneNumbers: [""],
      studentIds: [],
    };
    update((s) => {
      s.parents.push(newParent);
    });
    setSelectedParentId(newParent.id);
  };

  const addPhone = (parentId: string) => {
    update((s) => {
      const parent = s.parents.find((item) => item.id === parentId);
      if (parent) parent.phoneNumbers = [...parent.phoneNumbers, ""];
    });
  };

  const removePhone = (parentId: string, index: number) => {
    update((s) => {
      const parent = s.parents.find((item) => item.id === parentId);
      if (!parent) return;
      parent.phoneNumbers = parent.phoneNumbers.filter((_, i) => i !== index);
      if (!parent.phoneNumbers.length) parent.phoneNumbers = [""];
    });
  };

  const persistParent = async (parent: ParentDraft) => {
    try {
      if (!parent.fullName.trim()) {
        toast.error("Parent or guardian name is required.");
        return;
      }
      const payload = {
        id: parent.id,
        fullName: parent.fullName,
        email: parent.email,
        relationship: parent.relationship || "Parent",
        phoneNumbers: (parent.phoneNumbers ?? []).map((phone) => phone.trim()).filter(Boolean),
        studentIds: parent.studentIds ?? [],
      };
      await api.post("/v2/parents", payload);
      toast.success(`${parent.fullName} saved.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save parent details.");
    }
  };

  const deleteParent = (parentId: string) => {
    update((s) => {
      s.parents = s.parents.filter((p) => p.id !== parentId);
    });
    if (selectedParentId === parentId) setSelectedParentId(null);
    void api.delete(`/v2/parents/${encodeURIComponent(parentId)}`).catch(() => {
      toast.error("Could not delete on server; local record removed only.");
    });
  };

  const importParents = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const data = new Uint8Array(await file.arrayBuffer());
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: "" });
      if (!rawRows.length) throw new Error("No parent or guardian rows were found in the file.");

      const header = rawRows[0].map((cell) => String(cell ?? "").trim().toLowerCase());
      const hasHeader = header.some((cell) => /name|phone|mobile|email|guardian|parent|relationship|student|admission|class/.test(cell));

      const rows = (hasHeader ? rawRows.slice(1) : rawRows).map((row) => {
        const cells = Array.isArray(row) ? row : [];
        const rowMap: Record<string, string> = {};
        header.forEach((label, idx) => {
          rowMap[label] = String(cells[idx] ?? "").trim();
        });

        const studentName = rowMap.name || rowMap["student name"] || rowMap.student || "";
        const className = rowMap.class || rowMap["class name"] || rowMap.form || "";
        const admissionNo = rowMap.admission || rowMap.admissionno || rowMap["admission number"] || rowMap["admission no"] || "";
        
        const studentIds = admissionNo
          ? [state.students.find((student) => {
              const admissionMatch = student.admissionNo.toLowerCase() === admissionNo.toLowerCase();
              const classMatch = !className || state.classes.find((c) => c.id === student.classId)?.name?.toLowerCase() === className.toLowerCase();
              return admissionMatch && classMatch;
            })?.id]
              .filter(Boolean) as string[]
          : [];

        const name = rowMap.name || rowMap.fullname || rowMap.guardian || rowMap.parent || rowMap["parent name"] || rowMap["guardian name"] || "";
        const email = rowMap.email || rowMap["email address"] || "";
        const relationship = rowMap.relationship || rowMap.guardian || rowMap.parent || rowMap["parent/guardian"] || "Parent";
        
        const phoneNumbers = [
          rowMap.phone,
          rowMap["phone number"],
          rowMap["parent phone"],
          rowMap["parent phone number"],
          rowMap["guardian phone"],
          rowMap.mobile,
          rowMap["mobile number"],
        ].filter(Boolean).reduce((acc: string[], value) => {
          const parts = value.split(/[;,/|]/).map((p) => p.trim()).filter(Boolean);
          return [...acc, ...parts];
        }, []);

        return {
          id: `par_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          fullName: name,
          email,
          relationship,
          phoneNumbers: phoneNumbers.length ? phoneNumbers : [""],
          studentIds,
        };
      }).filter((row) => row.fullName || row.email || row.phoneNumbers.some(Boolean));

      if (!rows.length) throw new Error("No parent or guardian rows were found in the file.");
      setImportRows(rows);
      toast.success(`Prepared ${rows.length} parent record${rows.length === 1 ? "" : "s"} for import.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No parent or guardian rows were found in the file.");
    } finally {
      event.target.value = "";
    }
  };

  const confirmImport = async () => {
    if (!importRows) return;
    setExtracting(true);
    try {
      const prepared = importRows.map((row) => ({
        ...row,
        phoneNumbers: row.phoneNumbers.filter(Boolean),
      }));
      for (const row of prepared) {
        const parent = { ...row, studentIds: row.studentIds ?? [] };
        await api.post("/v2/parents", parent);
        update((s) => {
          s.parents.push({
            id: parent.id,
            fullName: parent.fullName || "Imported Parent",
            email: parent.email || "",
            relationship: parent.relationship || "Parent",
            phoneNumbers: parent.phoneNumbers.length ? parent.phoneNumbers : [""],
            studentIds: parent.studentIds,
          });
        });
      }
      toast.success(`${prepared.length} parent record${prepared.length === 1 ? "" : "s"} saved.`);
      setImportRows(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "The parent import failed.");
    } finally {
      setExtracting(false);
    }
  };

  const openStudentSelector = (parentId: string) => {
    setStudentSelector({ isOpen: true, parentId, query: "", sortBy: "name" });
  };

  const getFilteredStudents = () => {
    if (!studentSelector.parentId) return [];
    const parent = state.parents.find(p => p.id === studentSelector.parentId);
    if (!parent) return [];
    
    const q = studentSelector.query.toLowerCase();
    let filtered = state.students.filter(s => !parent.studentIds.includes(s.id));
    
    if (q) {
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(q) || 
        s.admissionNo.toLowerCase().includes(q)
      );
    }
    
    return filtered.sort((a, b) => {
      switch (studentSelector.sortBy) {
        case "admission":
          return a.admissionNo.localeCompare(b.admissionNo);
        case "class": {
          const classA = state.classes.find(c => c.id === a.classId)?.name || "";
          const classB = state.classes.find(c => c.id === b.classId)?.name || "";
          return classA.localeCompare(classB) || a.name.localeCompare(b.name);
        }
        case "name":
        default:
          return a.name.localeCompare(b.name);
      }
    });
  };

  const linkStudent = (studentId: string) => {
    if (!studentSelector.parentId) return;
    update((s) => {
      const parent = s.parents.find(p => p.id === studentSelector.parentId);
      if (parent && !parent.studentIds.includes(studentId)) {
        parent.studentIds.push(studentId);
      }
    });
    setStudentSelector({ ...studentSelector, query: "" });
    toast.success("Student linked successfully");
  };

  return (
    <div className="flex flex-col h-screen">
      <PageHeader
        title="Parents & Guardians"
        description="Add, edit, and import parent/guardian contact details used for report-card SMS communication."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => inputRef.current?.click()}><Upload className="h-4 w-4 mr-1" />Import Excel</Button>
            <Button onClick={createEmptyParent}><Plus className="h-4 w-4 mr-1" />Add parent</Button>
          </div>
        }
      />

      <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={importParents} />

      {(importRows && importRows.length > 0) && (
        <div className="px-4 pb-4">
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" /><strong>{importRows.length} imported parent rows</strong></div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setImportRows(null)}>Cancel</Button>
                <Button onClick={confirmImport} disabled={extracting}>{extracting ? "Saving..." : "Save imported parents"}</Button>
              </div>
            </div>
            <div className="grid gap-2 text-sm">
              {importRows.slice(0, 10).map((row, idx) => (
                <div key={`${row.fullName}-${idx}`} className="flex flex-wrap items-center gap-2 rounded-md border px-2 py-1.5">
                  <span className="font-medium">{row.fullName || "Unnamed"}</span>
                  <span className="text-muted-foreground">{row.relationship || "Parent"}</span>
                  {row.phoneNumbers?.length ? <span className="text-muted-foreground">{row.phoneNumbers.join(", ")}</span> : null}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      <div className="flex-1 overflow-hidden px-4 pb-4">
        <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-4 h-full">
          {/* Parents List */}
          <div className="flex flex-col border rounded-lg overflow-hidden bg-card">
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search parents..."
                  className="pl-9 h-9"
                />
                {query && <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setQuery("")}><X className="h-3.5 w-3.5" /></button>}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {parents.length > 0 ? (
                parents.map((parent) => (
                  <div
                    key={parent.id}
                    onClick={() => setSelectedParentId(parent.id)}
                    className={`p-4 border-b cursor-pointer transition-colors ${selectedParentId === parent.id ? "bg-primary/10 border-primary" : "hover:bg-muted"}`}
                  >
                    <div className="space-y-1">
                      <h3 className="font-semibold text-sm">{parent.fullName}</h3>
                      <p className="text-xs text-muted-foreground">{parent.relationship || "Parent"}</p>
                      {parent.phoneNumbers?.[0] && <p className="text-xs text-muted-foreground">{parent.phoneNumbers[0]}</p>}
                      <div className="mt-2 inline-block px-2 py-0.5 bg-primary/20 text-primary rounded text-xs font-medium">
                        {parent.studentIds.length} student{parent.studentIds.length === 1 ? "" : "s"}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  {query ? "No parents match" : "No parents yet"}
                </div>
              )}
            </div>
          </div>

          {/* Parent Details Editor */}
          {selectedParent ? (
            <div className="flex flex-col border rounded-lg overflow-hidden bg-card">
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="font-semibold text-lg">{selectedParent.fullName}</h2>
                <Button variant="ghost" size="icon" onClick={() => deleteParent(selectedParent.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs uppercase tracking-wide font-semibold text-muted-foreground"><UserRound className="h-3.5 w-3.5" />Full Name</label>
                  <Input 
                    value={selectedParent.fullName} 
                    onChange={(e) => update((s) => { const item = s.parents.find((p) => p.id === selectedParent.id); if (item) item.fullName = e.target.value; })} 
                    className="h-10"
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs uppercase tracking-wide font-semibold text-muted-foreground"><Mail className="h-3.5 w-3.5" />Email</label>
                  <Input 
                    value={selectedParent.email || ""} 
                    onChange={(e) => update((s) => { const item = s.parents.find((p) => p.id === selectedParent.id); if (item) item.email = e.target.value; })} 
                    placeholder="parent@example.com" 
                    className="h-10"
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs uppercase tracking-wide font-semibold text-muted-foreground"><Users className="h-3.5 w-3.5" />Role</label>
                  <Input 
                    value={selectedParent.relationship || "Parent"} 
                    onChange={(e) => update((s) => { const item = s.parents.find((p) => p.id === selectedParent.id); if (item) item.relationship = e.target.value; })} 
                    placeholder="Parent / Guardian / Sponsor" 
                    className="h-10"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs uppercase tracking-wide font-semibold text-muted-foreground"><Phone className="h-3.5 w-3.5" />Phone numbers</label>
                    <Button type="button" variant="outline" size="sm" onClick={() => addPhone(selectedParent.id)} className="text-xs">Add</Button>
                  </div>
                  <div className="space-y-2">
                    {(selectedParent.phoneNumbers || [""]).map((phone, idx) => (
                      <div key={`${selectedParent.id}-${idx}`} className="flex items-center gap-2">
                        <Input 
                          value={phone} 
                          onChange={(e) => update((s) => { const item = s.parents.find((p) => p.id === selectedParent.id); if (!item) return; item.phoneNumbers[idx] = e.target.value; })} 
                          placeholder="+254..." 
                          className="h-9"
                        />
                        <Button variant="ghost" size="icon" onClick={() => removePhone(selectedParent.id, idx)} className="h-9 w-9"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs uppercase tracking-wide font-semibold text-muted-foreground"><Users className="h-3.5 w-3.5" />Linked Students</label>
                    <Button type="button" variant="outline" size="sm" onClick={() => openStudentSelector(selectedParent.id)} className="text-xs">
                      Link +
                    </Button>
                  </div>
                  {(selectedParent.studentIds || []).length > 0 ? (
                    <div className="space-y-2">
                      {selectedParent.studentIds.map((studentId) => {
                        const student = state.students.find(s => s.id === studentId);
                        const className = state.classes.find(c => c.id === student?.classId)?.name || "?";
                        return (
                          <div key={studentId} className="flex items-center justify-between rounded-md border px-3 py-2 bg-muted/50 text-sm">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-medium">{student?.name || "Unknown"}</span>
                              <span className="text-xs text-muted-foreground">{student?.admissionNo} • {className}</span>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => {
                              update((s) => {
                                const item = s.parents.find((p) => p.id === selectedParent.id);
                                if (item) {
                                  item.studentIds = item.studentIds.filter(id => id !== studentId);
                                }
                              });
                            }} className="h-8 w-8"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-md border border-dashed px-3 py-2 text-center text-sm text-muted-foreground bg-muted/30">
                      No students linked
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 border-t">
                <Button className="w-full" onClick={() => persistParent(selectedParent)}>Save Changes</Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center border rounded-lg bg-card text-muted-foreground">
              <p>Select a parent to edit or create a new one</p>
            </div>
          )}
        </div>
      </div>

      {studentSelector.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-lg">Link Students</h3>
              <Button variant="ghost" size="icon" onClick={() => setStudentSelector({ ...studentSelector, isOpen: false })}><X className="h-4 w-4" /></Button>
            </div>

            <div className="p-4 border-b space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={studentSelector.query}
                  onChange={(e) => setStudentSelector({ ...studentSelector, query: e.target.value })}
                  placeholder="Search by name or admission number..."
                  className="pl-9 h-10"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-muted-foreground">Sort:</span>
                <Button 
                  variant={studentSelector.sortBy === "name" ? "default" : "outline"}
                  size="sm" 
                  onClick={() => setStudentSelector({ ...studentSelector, sortBy: "name" })}
                  className="text-xs"
                >
                  By Name
                </Button>
                <Button 
                  variant={studentSelector.sortBy === "admission" ? "default" : "outline"}
                  size="sm" 
                  onClick={() => setStudentSelector({ ...studentSelector, sortBy: "admission" })}
                  className="text-xs"
                >
                  By Admission
                </Button>
                <Button 
                  variant={studentSelector.sortBy === "class" ? "default" : "outline"}
                  size="sm" 
                  onClick={() => setStudentSelector({ ...studentSelector, sortBy: "class" })}
                  className="text-xs"
                >
                  By Class
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {getFilteredStudents().length > 0 ? (
                <div className="grid gap-2">
                  {getFilteredStudents().map((student) => {
                    const className = state.classes.find(c => c.id === student.classId)?.name || "?";
                    return (
                      <button
                        key={student.id}
                        onClick={() => linkStudent(student.id)}
                        className="text-left p-3 rounded-md border hover:border-primary hover:bg-primary/5 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold">{student.name}</h4>
                            <p className="text-sm text-muted-foreground">{student.admissionNo} • {className}</p>
                          </div>
                          <span className="text-xs bg-muted px-2 py-1 rounded ml-2">{student.gender}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {studentSelector.query ? "No students match your search" : "All students are already linked"}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
