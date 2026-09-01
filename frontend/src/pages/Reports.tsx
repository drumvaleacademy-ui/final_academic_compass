import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  SchoolLogoIcon } from "@/components/SchoolLogo";
import { Download, FileText, Printer, Users, GraduationCap, Loader2, MessageSquare } from "lucide-react";
import { useSchool } from "@/store/school";
import { useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { getCurriculumGradeScale, gradeFor } from "@/lib/schoolData";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ReportCardProps {
  schoolName?: string;
  studentId?: string;
  studentName?: string;
  admissionNumber?: string;
  className?: string;
  stream?: string;
  term?: string;
  year?: number;
  overallPercentage?: number;
  grade?: string;
  subjects?: Array<{
    name: string;
    code: string;
    cat1: number | null;
    cat2: number | null;
    exam: number | null;
    total: number;
    grade: string;
    teacherComment?: string;
  }>;
  teacherName?: string;
  principalName?: string;
  curriculumName?: string;
  curriculumId?: string;
  termEndDate?: string;
  nextTermStartDate?: string;
}

const GRADE_BANDS = [
  { min: 80, grade: "A", description: "Exceptional" },
  { min: 70, grade: "B", description: "Excellent" },
  { min: 60, grade: "C", description: "Good" },
  { min: 50, grade: "D", description: "Satisfactory" },
  { min: 40, grade: "E", description: "Needs Improvement" },
  { min: 0, grade: "F", description: "Fail" },
] as const;

function gradeString(percentage: number, curriculumId?: string): string {
  const scale = getCurriculumGradeScale(curriculumId ?? "cbc");
  const band = scale.find((b) => percentage >= b.min && percentage <= b.max);
  return band ? band.grade : (scale[scale.length - 1]?.grade ?? "F");
}

function makePdfFileName(value: string) {
  return String(value || "report").toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "report";
}

function getDirectReportPdfUrl(studentId: string, examId: string) {
  const configuredBase = (import.meta.env.VITE_REPORT_PDF_BASE_URL ?? "").trim().replace(/\/$/, "");
  const fileName = `${makePdfFileName(studentId)}-${makePdfFileName(examId)}.pdf`;
  if (configuredBase) return `${configuredBase}/${fileName}`;
  return `https://report-pdfs.drumvalesecondary.com/${fileName}`;
}

function buildResultSummary(subjects: NonNullable<ReportCardProps["subjects"]>, curriculumId?: string) {
  const validSubjects = subjects.filter((subject) => typeof subject.total === "number" && subject.total > 0);
  const subjectCount = validSubjects.length;
  const average = subjectCount ? validSubjects.reduce((sum, subject) => sum + (subject.total ?? 0), 0) / subjectCount : 0;
  const percentage = Math.round((average / 100) * 100);
  const overallGrade = gradeFor(percentage, getCurriculumGradeScale(curriculumId ?? "cbc"));
  const bestSubject = validSubjects.reduce((best, current) => {
    if (!best || (current.total ?? 0) > (best.total ?? 0)) return current;
    return best;
  }, validSubjects[0]);

  return {
    subjectCount,
    average: percentage,
    overallGrade: overallGrade?.grade ?? "N/A",
    bestSubject: bestSubject ? `${bestSubject.name} ${bestSubject.grade}` : "No subject summary available",
  };
}

function buildReportCardSmsMessage(studentName: string, curriculumId: string | undefined, summary: ReturnType<typeof buildResultSummary>, pdfUrl: string) {
  const curriculumLabel = String(curriculumId ?? "cbc").toLowerCase() === "844" ? "844" : "CBC";
  const gradeLine = `${summary.average}% (${summary.overallGrade})`;
  if (curriculumLabel === "844") {
    return `Dear Parent, ${studentName}'s 8-4-4 results are ready. ${summary.subjectCount} subjects: ${gradeLine}. Best performance: ${summary.bestSubject}. Final result slip: ${pdfUrl}`;
  }

  return `Dear Parent, ${studentName}'s CBC results are ready. ${summary.subjectCount} learning areas: ${gradeLine}. Best performance: ${summary.bestSubject}. Final result slip: ${pdfUrl}`;
}

function formatReportDate(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

const SAMPLE_SUBJECTS: NonNullable<ReportCardProps["subjects"]> = [
  { name: "Mathematics", code: "MAT", cat1: 42, cat2: 38, exam: 75, total: 155, grade: "B", teacherComment: "Good improvement in algebra." },
  { name: "English", code: "ENG", cat1: 35, cat2: 40, exam: 68, total: 143, grade: "B", teacherComment: "Shows strong reading skills." },
  { name: "Kiswahili", code: "KIS", cat1: 45, cat2: 42, exam: 72, total: 159, grade: "A", teacherComment: "Excellent comprehension." },
  { name: "Science", code: "SCI", cat1: 38, cat2: 44, exam: 65, total: 147, grade: "B", teacherComment: "Good practical work." },
  { name: "Social Studies", code: "SST", cat1: 40, cat2: 35, exam: 58, total: 133, grade: "C", teacherComment: "Needs more focus on geography." },
  { name: "C.R.E", code: "CRE", cat1: 44, cat2: 46, exam: 78, total: 168, grade: "A", teacherComment: "Outstanding moral reasoning." },
  { name: "IRE", code: "IRE", cat1: null, cat2: null, exam: null, total: 0, grade: "-" },
  { name: "French", code: "FRE", cat1: null, cat2: null, exam: null, total: 0, grade: "-" },
  { name: "Home Science", code: "HOS", cat1: 30, cat2: 35, exam: 42, total: 107, grade: "D", teacherComment: "Participation needs improvement." },
  { name: "Agriculture", code: "AGR", cat1: 38, cat2: 40, exam: 55, total: 133, grade: "C", teacherComment: "Shows interest in practical work." },
  { name: "Computer Studies", code: "CMP", cat1: 45, cat2: 48, exam: 85, total: 178, grade: "A", teacherComment: "Excellent programming skills." },
  { name: "Fine Art", code: "ART", cat1: null, cat2: null, exam: null, total: 0, grade: "-" },
];

export default function Reports() {
  const { state } = useSchool();
  const [searchParams] = useSearchParams();
  const [studentId, setStudentId] = useState(searchParams.get("studentId") || searchParams.get("student") || "");
  const [classFilter, setClassFilter] = useState(searchParams.get("classId") || "");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"learner" | "teacher" | "class" | "subject">("learner");
  const [examId, setExamId] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const selectedStudent = state.students.find((student) => student.id === studentId);
  const classes = state.classes;
  const exams = state.exams.filter((exam) => exam.status !== "draft");

  const reportRows = useMemo(() => {
    const rows = state.entries.map((entry) => {
      const sheet = state.sheets.find((item) => item.id === entry.sheetId);
      const student = state.students.find((item) => item.id === entry.studentId);
      const subject = state.subjects.find((item) => item.id === sheet?.subjectId);
      const exam = state.exams.find((item) => item.id === sheet?.examId);
      const classItem = state.classes.find((item) => item.id === sheet?.classId || item.id === student?.classId);
      const stream = state.streams.find((item) => item.id === student?.streamId);
      const teacher = state.teachers.find((item) => item.id === sheet?.teacherId || item.id === subject?.teacherId);
      return {
        id: entry.id,
        studentId: student?.id,
        learner: student?.name ?? "Unknown learner",
        admission: student?.admissionNo ?? "",
        teacher: teacher?.name ?? "Unassigned",
        classId: classItem?.id ?? student?.classId ?? "",
        className: classItem?.name ?? "Unassigned",
        streamId: stream?.id ?? student?.streamId ?? "",
        stream: stream?.name ?? "",
        subject: subject?.name ?? "Unknown subject",
        exam: exam?.name ?? "Unknown exam",
        score: entry.score,
        pending: entry.pending,
      };
    });
    const q = search.trim().toLowerCase();

    return rows
      .filter((row) => {
        const matchesClass = !classFilter || row.classId === classFilter;
        const matchesExam = !examId || state.exams.find((item) => item.name === row.exam)?.id === examId;
        const matchesQuery = !q || [row.learner, row.admission, row.teacher, row.className, row.stream, row.subject, row.exam].some((value) => value.toLowerCase().includes(q));
        return matchesClass && matchesExam && matchesQuery;
      })
      .sort((a, b) => {
        if (sortBy === "class") {
          const classCompare = String(a.className ?? "").localeCompare(String(b.className ?? ""));
          if (classCompare !== 0) return classCompare;
          return String(a.stream ?? "").localeCompare(String(b.stream ?? ""));
        }

        if (sortBy === "teacher") {
          return String(a.teacher ?? "").localeCompare(String(b.teacher ?? ""));
        }

        if (sortBy === "subject") {
          return String(a.subject ?? "").localeCompare(String(b.subject ?? ""));
        }

        return String(a.learner ?? "").localeCompare(String(b.learner ?? ""));
      });
  }, [state, search, sortBy, classFilter, examId]);

  const selectedExam = exams.find((exam) => exam.id === examId) ?? exams[exams.length - 1];
  const reportClass = selectedStudent ? state.classes.find((item) => item.id === selectedStudent.classId) : undefined;
  const reportStream = selectedStudent ? state.streams.find((item) => item.id === selectedStudent.streamId) : undefined;
  const reportCurriculum = selectedStudent ? state.curricula.find((item) => item.id === reportClass?.curriculumId) : undefined;
  const reportCardSubjects = useMemo(() => {
    if (!selectedStudent || !selectedExam) return [];
    return state.subjects.map((subject) => {
      const sheet = state.sheets.find((item) => item.examId === selectedExam.id && item.subjectId === subject.id && item.classId === selectedStudent.classId);
      const entry = sheet ? state.entries.find((item) => item.sheetId === sheet.id && item.studentId === selectedStudent.id) : undefined;
      const score = entry?.score ?? null;
      const gradeBand = score == null ? null : gradeFor(score, getCurriculumGradeScale(selectedExam?.curriculumId ?? reportCurriculum?.id ?? "cbc"));
      return { name: subject.name, code: subject.code, cat1: null, cat2: null, exam: score, total: score ?? 0, grade: gradeBand?.grade ?? "-", teacherComment: sheet?.teacherComment };
    }).filter((subject) => subject.exam !== null);
  }, [selectedStudent, selectedExam, reportCurriculum, state]);
  const nextTermExam = selectedExam ? exams.find((exam) => exam.year === selectedExam.year && exam.term === selectedExam.term + 1) ?? exams.find((exam) => exam.year === selectedExam.year + 1 && exam.term === 1) : undefined;

  const openReport = (id: string) => {
    setStudentId(id);
    setPreviewOpen(true);
  };

  const exportReports = async () => {
    if (!selectedStudent || !selectedExam || !reportRef.current) { toast.error("Select a learner with an exam before exporting."); return; }
    setIsExporting(true);
    const source = reportRef.current;
    const exportNode = source.cloneNode(true) as HTMLDivElement;
    exportNode.style.width = "794px";
    exportNode.style.backgroundColor = "#ffffff";
    exportNode.style.position = "fixed";
    exportNode.style.left = "-10000px";
    exportNode.style.top = "0";
    exportNode.style.color = "#111827";
    document.body.appendChild(exportNode);
    try {
      exportNode.querySelectorAll("style").forEach((style) => style.remove());
      const sourceElements = [source, ...Array.from(source.querySelectorAll("*"))];
      const exportElements = [exportNode, ...Array.from(exportNode.querySelectorAll("*"))];
      const colorProperties = ["color", "background-color", "background-image", "border-color", "fill", "stroke", "box-shadow", "text-shadow"];
      exportElements.forEach((element, index) => {
        const sourceElement = sourceElements[index];
        if (!sourceElement) return;
        const computed = window.getComputedStyle(sourceElement);
        colorProperties.forEach((property) => {
          const value = computed.getPropertyValue(property);
          if (!value) return;
          const fallback = /background-color/.test(property) ? "#ffffff" : /background-image|box-shadow|text-shadow/.test(property) ? "none" : "#111827";
          element instanceof HTMLElement && element.style.setProperty(property, /okl(?:ab|ch)/i.test(value) ? fallback : value);
        });
      });
      const canvas = await html2canvas(exportNode, { scale: 2, backgroundColor: "#ffffff", useCORS: true, logging: false });
      const pdf = new jsPDF("p", "mm", "a4");
      const width = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight() - 14;
      const renderedHeight = (canvas.height * width) / canvas.width;
      const image = canvas.toDataURL("image/png");

      const totalPages = Math.ceil(renderedHeight / pageHeight);
      for (let page = 0; page < totalPages; page++) {
        if (page > 0) pdf.addPage();
        const offset = page * pageHeight;
        pdf.addImage(image, "PNG", 0, -(offset), width, renderedHeight + 12, undefined, "FAST");
      }
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const safe = (value: string) => value.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
      pdf.save(`report-${safe(reportClass?.name || "class")}-${safe(selectedStudent.name)}-${stamp}.pdf`);
      toast.success("Report PDF exported");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not export this report as PDF.");
    } finally {
      exportNode.remove();
      setIsExporting(false);
    }
  };

  const sendReportCard = async () => {
    if (!selectedStudent) { toast.error("Select a student first"); return; }
    if (!selectedExam) { toast.error("Select a valid exam before sending the SMS."); return; }

    setIsSending(true);
    try {
      const curriculumId = reportCurriculum?.id || selectedExam.curriculumId || "cbc";
      const reportSummary = buildResultSummary(reportCardSubjects, curriculumId);
      const pdfUrl = getDirectReportPdfUrl(selectedStudent.id, selectedExam.id);
      const message = buildReportCardSmsMessage(selectedStudent.name, curriculumId, reportSummary, pdfUrl);

      const response = await api.post<{ success: boolean; error?: string }>('/v2/sms/report-card', {
        studentId,
        message,
        reportUrl: pdfUrl,
      });

      if (!response?.success) {
        throw new Error(response?.error || "The SMS provider rejected the report-card message.");
      }

      toast.success("Report card SMS sent to the registered parent contact");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send report card SMS");
    } finally {
      setIsSending(false);
    }
  };

  const printReport = () => {
    setIsPrinting(true);
    window.setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 50);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Report Cards"
        description="Generate, view, and print student report cards with official school letterhead."
        actions={
          <div className="flex gap-2">
            <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Learner</label><Select value={studentId} onValueChange={openReport}>
              <SelectTrigger className="w-52"><SelectValue placeholder="Select learner" /></SelectTrigger>
              <SelectContent>{state.students.map((student) => <SelectItem key={student.id} value={student.id}>{student.name}</SelectItem>)}</SelectContent>
            </Select></div>
            <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Class</label><Select value={classFilter || "all"} onValueChange={(value) => { setClassFilter(value === "all" ? "" : value); setStudentId(""); setPreviewOpen(false); }}>
              <SelectTrigger className="w-44"><SelectValue placeholder="All classes" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All classes</SelectItem>{classes.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
            </Select></div>
            <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Exam</label><Select value={examId || "all"} onValueChange={(value) => { setExamId(value === "all" ? "" : value); setStudentId(""); setPreviewOpen(false); }}>
              <SelectTrigger className="w-44"><SelectValue placeholder="All exams" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All exams</SelectItem>{exams.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
            </Select></div>
            <Button variant="outline" size="sm" onClick={sendReportCard} disabled={!selectedStudent}>Send SMS</Button>
          </div>
        }
      />

      <Card className="p-4 space-y-4">
        <div className="flex flex-wrap gap-2 items-center">
          <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Search</label><input className="inline-edit min-w-[220px]" placeholder="Learner, teacher, class..." value={search} onChange={(event) => setSearch(event.target.value)} /></div>
          <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Sort results</label><Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="learner">Learner</SelectItem><SelectItem value="teacher">Teacher</SelectItem><SelectItem value="class">Class</SelectItem><SelectItem value="subject">Subject</SelectItem></SelectContent>
          </Select></div>
          <Badge variant="outline">{reportRows.length} result{reportRows.length === 1 ? "" : "s"}</Badge>
        </div>
        <div className="list-scroll-container overflow-x-auto border rounded-md">
          <table className="data-table min-w-[980px]"><thead><tr><th>Learner</th><th>Teacher</th><th>Class</th><th>Subject</th><th>Exam</th><th>Score</th><th>Status</th></tr></thead><tbody>{reportRows.length ? reportRows.map((row) => <tr key={row.id} className="cursor-pointer hover:bg-muted/40" onClick={() => row.studentId && openReport(row.studentId)}><td><button type="button" className="text-left"><div className="font-medium text-primary">{row.learner}</div><div className="text-xs text-muted-foreground">{row.admission}</div></button></td><td>{row.teacher}</td><td>{row.className} {row.stream && `· ${row.stream}`}</td><td>{row.subject}</td><td>{row.exam}</td><td className="font-semibold">{row.score ?? "Not entered"}</td><td>{row.pending ? <Badge variant="outline">Pending</Badge> : <Badge>Saved</Badge>}</td></tr>) : <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">No report results exist yet. Enter marks to generate reports for each learner.</td></tr>}</tbody></table>
        </div>
      </Card>

      <Dialog open={previewOpen && !!selectedStudent && !!selectedExam} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-6xl p-4 sm:p-6">
          <DialogHeader>
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex-1">
                <DialogTitle>Report Card Preview</DialogTitle>
                <DialogDescription>{selectedStudent?.name} · {selectedStudent?.admissionNo}</DialogDescription>
              </div>
              <div className="flex gap-2 items-end">
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" onClick={() => { const idx = reportRows.findIndex(r => r.studentId === selectedStudent?.id); if (idx > 0) { const prevRow = reportRows[idx - 1]; if (prevRow.studentId) setStudentId(prevRow.studentId); } }}>←</Button>
                  <Button variant="outline" size="sm" onClick={() => { const idx = reportRows.findIndex(r => r.studentId === selectedStudent?.id); if (idx < reportRows.length - 1) { const nextRow = reportRows[idx + 1]; if (nextRow.studentId) setStudentId(nextRow.studentId); } }}>→</Button>
                </div>
                <div className="w-48">
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Exam</label>
                  <Select value={examId || "all"} onValueChange={(value) => setExamId(value === "all" ? "" : value)}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select exam" /></SelectTrigger>
                    <SelectContent>{exams.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </DialogHeader>
          {selectedStudent && selectedExam && <div ref={reportRef} className="report-preview print-page max-h-[65vh] overflow-y-auto bg-background p-2"><ReportCardPreview schoolName={state.settings.schoolName} studentId={selectedStudent.id} studentName={selectedStudent.name} admissionNumber={selectedStudent.admissionNo} className={reportClass?.name} stream={reportStream?.name} term={`Term ${selectedExam.term}`} year={selectedExam.year} subjects={reportCardSubjects} teacherName="" principalName={state.settings.principalName} curriculumName={reportCurriculum?.name || reportCurriculum?.shortName || selectedExam.curriculumId} curriculumId={reportCurriculum?.id || selectedExam.curriculumId || "cbc"} termEndDate={selectedExam.endDate} nextTermStartDate={nextTermExam?.startDate} /></div>}
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between sm:space-x-0">
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Close</Button>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={printReport} disabled={isPrinting}>{isPrinting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Printer className="mr-1 h-4 w-4" />}Print</Button>
              <Button variant="outline" onClick={exportReports} disabled={isExporting}>{isExporting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Download className="mr-1 h-4 w-4" />}Export PDF</Button>
              <Button onClick={sendReportCard} disabled={isSending}>{isSending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-1 h-4 w-4" />}Send SMS</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

function ReportCardPreview(props: ReportCardProps) {
  const { state } = useSchool();
  const maxTotal = 200;
  const totalObtained = (props.subjects || []).reduce((sum, s) => sum + s.total, 0);
  const totalPossible = (props.subjects || []).filter((s) => s.grade !== "-").length * maxTotal;
  const percentage = totalPossible > 0 ? Math.round((totalObtained / totalPossible) * 100) : 0;
  const gradeScale = getCurriculumGradeScale(props.curriculumId ?? "cbc");
  const overallGradeBand = gradeFor(percentage, gradeScale);
  const overallGrade = overallGradeBand?.grade ?? "N/A";

  const gradeDescriptions: Record<string, string> = {
    "Exceeding Expectation": "Exceptional - Work is excellent in all areas",
    "Meeting Expectation": "Very Good - Above average performance",
    "Approaching Expectation": "Good - Satisfactory work with room for improvement",
    "Below Expectation": "Needs Improvement - Significant work needed",
    A: "Exceptional - Work is excellent in all areas",
    B: "Very Good - Above average performance",
    C: "Good - Satisfactory work with room for improvement",
    D: "Satisfactory - Basic requirements met",
    E: "Needs Improvement - Significant work needed",
    F: "Fail - Below required standard",
  };

  return (
    <div className="report-card-printable mx-auto max-w-4xl">
      <style>{`
        @media print {
          .report-card-printable {
            padding: 0;
            margin: 0;
          }
        }
      `}</style>

      {/* Letterhead Header */}
      <div className="border-2 border-primary/20 rounded-lg bg-card shadow-sm overflow-hidden">
        <div className="bg-gradient-to-b from-primary/5 to-transparent border-b-2 border-dashed border-primary/10">
          <div className="px-6 py-4 md:py-6">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <SchoolLogoIcon size="xl" />
              </div>
               <div className="flex-1">
                 <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                   {props.schoolName || state.settings.schoolName}
                 </h1>
                 <p className="text-sm font-medium text-primary">
                   {state.settings.schoolMotto}
                 </p>
                 <p className="text-xs md:text-sm text-muted-foreground mt-1">
                   {state.settings.schoolAddress} · Email: {state.settings.schoolEmail} · Web: {state.settings.schoolWebsite}
                 </p>
               </div>
              <div className="flex-shrink-0 text-right">
                <Badge variant="outline" className="text-xs">
                  {props.year || new Date().getFullYear()}
                </Badge>
                <div className="text-xs text-muted-foreground mt-1">
                  {props.term} · {props.curriculumName || "Curriculum"}
                </div>
              </div>
            </div>
          </div>

          {/* Report Card Title Banner */}
          <div className="bg-primary/10 border-t border-primary/20 px-6 py-3">
            <h2 className="text-center text-lg font-semibold text-foreground">
              STUDENT REPORT CARD — {props.term || "TERM"} {props.year || new Date().getFullYear()}
            </h2>
          </div>
        </div>

        {/* Student Information Section */}
        <div className="px-6 py-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground">Student Name</Label>
              <p className="text-sm font-semibold">{props.studentName}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground">Admission No.</Label>
              <p className="text-sm font-semibold">{props.admissionNumber}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground">Class</Label>
              <p className="text-sm font-semibold">{props.className}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground">Stream</Label>
              <p className="text-sm font-semibold">{props.stream}</p>
            </div>
          </div>

          {/* Subjects Table */}
          <div className="border border-border rounded-lg overflow-hidden mb-5">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs">#</TableHead>
                  <TableHead className="text-xs">Subject</TableHead>
                  <TableHead className="text-xs text-center">CAT 1</TableHead>
                  <TableHead className="text-xs text-center">CAT 2</TableHead>
                  <TableHead className="text-xs text-center">Exam</TableHead>
                  <TableHead className="text-xs text-center">Total</TableHead>
                  <TableHead className="text-xs text-center">Max</TableHead>
                  <TableHead className="text-xs text-center">Grade</TableHead>
                  <TableHead className="text-xs">Teacher Comment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(props.subjects ?? []).map((subj, idx) => {
                  const isOptional = subj.grade === "-";
                  return (
                    <TableRow key={subj.code} className={isOptional ? "opacity-60" : ""}>
                      <TableCell className="text-xs">{idx + 1}</TableCell>
                      <TableCell className="font-medium text-sm">
                        {subj.name} <span className="text-xs text-muted-foreground">({subj.code})</span>
                      </TableCell>
                      <TableCell className="text-center text-sm">{subj.cat1 ?? "-"}</TableCell>
                      <TableCell className="text-center text-sm">{subj.cat2 ?? "-"}</TableCell>
                      <TableCell className="text-center text-sm">{subj.exam ?? "-"}</TableCell>
                      <TableCell className="text-center font-semibold text-sm">{subj.total}</TableCell>
                      <TableCell className="text-center text-xs text-muted-foreground">{maxTotal}</TableCell>
                      <TableCell className="text-center">
                        {isOptional ? (
                          <span className="text-xs text-muted-foreground">N/A</span>
                        ) : (
                          <Badge
                            variant={subj.grade === "F" ? "destructive" : "default"}
                            className={`${subj.grade === "A" ? "bg-green-100 text-green-800" :
                              subj.grade === "B" ? "bg-blue-100 text-blue-800" :
                              subj.grade === "C" ? "bg-amber-100 text-amber-800" :
                              subj.grade === "D" ? "bg-orange-100 text-orange-800" :
                              subj.grade === "E" ? "bg-red-100 text-red-800" :
                              subj.grade === "F" ? "bg-red-200 text-red-900" :
                              "bg-muted text-muted-foreground"} text-xs font-bold`}
                          >
                            {subj.grade}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {subj.teacherComment || "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Summary Section */}
          <div className="grid md:grid-cols-2 gap-5 mb-5">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Performance Summary
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Total Obtained:</span>
                  <p className="font-bold">{totalObtained} / {totalPossible}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Percentage:</span>
                  <p className="font-bold">{percentage}%</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Overall Grade:</span>
                  <p className="font-bold text-2xl text-primary">{overallGrade}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Grade Description:</span>
                  <p className="font-semibold">{gradeDescriptions[overallGrade] || ""}</p>
                </div>
              </div>
              <div className="pt-2">
                <Label className="text-xs font-medium text-muted-foreground">Class Teacher's Comment</Label>
                <p className="text-sm mt-1 italic text-muted-foreground">No class teacher remarks recorded for this learner.</p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Approval & Sign-off
              </h3>
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-xs text-muted-foreground block">Class Teacher:</span>
                    <p className="font-medium mt-1 border-b-2 border-dashed border-muted pb-1">{props.teacherName || "-"}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Date:</span>
                    <p className="font-medium mt-1 border-b-2 border-dashed border-muted pb-1">{formatReportDate(props.termEndDate) || "Not set"}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Principal:</span>
                    <p className="font-medium mt-1 border-b-2 border-dashed border-muted pb-1">
                      {props.principalName || state.settings.principalName}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {state.settings.principalTitle}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Signature:</span>
                    <p className="font-medium mt-1 border-b-2 border-dashed border-muted pb-1">&nbsp;</p>
                  </div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Next Term Begins:</span>
                  <p className="font-medium mt-1 border-b-2 border-dashed border-muted pb-1">{formatReportDate(props.nextTermStartDate) || "Not set"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Letterhead Footer */}
          <div className="border-t-2 border-dashed border-primary/10 pt-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <SchoolLogoIcon size="sm" />
              <span className="font-semibold text-sm">{props.schoolName || state.settings.schoolName}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {state.settings.schoolMotto}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Vision: {state.settings.schoolVision}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              © {new Date().getFullYear()} {state.settings.schoolName} · {state.settings.schoolWebsite}
            </p>
          </div>
        </div>
      </div>

      {/* Grade Scale Reference */}
      <Card className="p-4 mt-6 bg-muted/30">
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <GraduationCap className="h-4 w-4" />
          Grade Scale ({props.curriculumName || "configured curriculum"})
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center text-xs">
          {gradeScale.map((band) => (
            <div key={band.grade} className="p-2 border rounded">
              <span className="font-bold">{band.min}-{band.max}%</span>
              <span className="block text-muted-foreground">{band.grade}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={className}>{children}</label>;
}
