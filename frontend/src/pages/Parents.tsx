import { useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Trash2, Upload, X, Phone, Mail, UserRound, Users } from "lucide-react";
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

export default function ParentsPage() {
  const { state, update, saveDetails } = useSchool();
  const [query, setQuery] = useState("");
  const [importRows, setImportRows] = useState<any[] | null>(null);
  const [extracting, setExtracting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const parents = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.parents.filter((parent) => {
      if (!q) return true;
      return [parent.fullName, parent.email, parent.relationship, parent.phoneNumbers.join(", ")]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [query, state.parents]);

  const createEmptyParent = () => {
    update((s) => {
      s.parents.push({
        id: `par_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        fullName: "New Parent",
        email: "",
        relationship: "Parent",
        phoneNumbers: [""],
        studentIds: [],
      });
    });
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

        // Extract student name and find student by class + admission number
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

        // Extract parent/guardian name - prioritize phone row column names
        const name = rowMap.name || rowMap.fullname || rowMap.guardian || rowMap.parent || rowMap["parent name"] || rowMap["guardian name"] || "";
        const email = rowMap.email || rowMap["email address"] || "";
        const relationship = rowMap.relationship || rowMap.guardian || rowMap.parent || rowMap["parent/guardian"] || "Parent";
        
        // Map phone numbers - prioritize parent phone columns
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

  return (
    <div>
      <PageHeader
        title="Parents & Guardians"
        description="Add, edit, and import parent/guardian contact details used for report-card SMS communication."
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search contacts..."
                className="pl-9 h-9 w-64"
              />
              {query && <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setQuery("")}><X className="h-3.5 w-3.5" /></button>}
            </div>
            <Button variant="outline" onClick={() => inputRef.current?.click()}><Upload className="h-4 w-4 mr-1" />Import Excel</Button>
            <Button onClick={createEmptyParent}><Plus className="h-4 w-4 mr-1" />Add parent</Button>
            <Button variant="secondary" size="sm" onClick={() => saveDetails?.()}>Save details</Button>
          </div>
        }
      />

      <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={importParents} />

      {(importRows && importRows.length > 0) && (
        <Card className="mb-4 p-4">
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
      )}

      <div className="grid gap-4">
        {parents.map((parent) => (
          <Card key={parent.id} className="p-4">
            <div className="grid gap-4 md:grid-cols-[1.4fr_1.1fr_1.1fr_auto] items-start">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground"><UserRound className="h-3.5 w-3.5" />Name</label>
                <Input value={parent.fullName} onChange={(e) => update((s) => { const item = s.parents.find((p) => p.id === parent.id); if (item) item.fullName = e.target.value; })} />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground"><Mail className="h-3.5 w-3.5" />Email</label>
                <Input value={parent.email || ""} onChange={(e) => update((s) => { const item = s.parents.find((p) => p.id === parent.id); if (item) item.email = e.target.value; })} placeholder="parent@example.com" />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground"><Users className="h-3.5 w-3.5" />Role</label>
                <Input value={parent.relationship || "Parent"} onChange={(e) => update((s) => { const item = s.parents.find((p) => p.id === parent.id); if (item) item.relationship = e.target.value; })} placeholder="Parent / Guardian / Sponsor" />
              </div>
              <Button variant="ghost" size="icon" onClick={() => deleteParent(parent.id)} className="mt-7"><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground"><Phone className="h-3.5 w-3.5" />Phone numbers</label>
                <Button type="button" variant="outline" size="sm" onClick={() => addPhone(parent.id)}>Add phone</Button>
              </div>
              {(parent.phoneNumbers || [""]).map((phone, idx) => (
                <div key={`${parent.id}-${idx}`} className="flex items-center gap-2">
                  <Input value={phone} onChange={(e) => update((s) => { const item = s.parents.find((p) => p.id === parent.id); if (!item) return; item.phoneNumbers[idx] = e.target.value; })} placeholder="+254..." />
                  <Button variant="ghost" size="icon" onClick={() => removePhone(parent.id, idx)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => persistParent(parent)}>Save parent</Button>
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                {parent.studentIds.length || 0} linked student{(parent.studentIds.length || 0) === 1 ? "" : "s"}
              </span>
            </div>
          </Card>
        ))}
      </div>

      {!parents.length && (
        <Card className="p-8 text-center text-muted-foreground">No parent or guardian records yet.</Card>
      )}
    </div>
  );
}
