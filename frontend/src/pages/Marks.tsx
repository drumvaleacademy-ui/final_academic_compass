import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { useSchool } from "@/store/school";
import { Badge } from "@/components/ui/badge";
import { useMemo } from "react";
import { belongsToCurriculum } from "@/lib/schoolData";

export default function Marks() {
  const { state, activeCurriculum } = useSchool();
  const rows = useMemo(() => state.entries.map((entry) => {
    const sheet = state.sheets.find((item) => item.id === entry.sheetId);
    const student = state.students.find((item) => item.id === entry.studentId);
    const subject = state.subjects.find((item) => item.id === sheet?.subjectId);
    const exam = state.exams.find((item) => item.id === sheet?.examId);
    return { ...entry, student: student?.name ?? "Unknown student", subject: subject?.name ?? "Unknown subject", exam: exam?.name ?? "Unknown exam" };
  }).filter((row) => belongsToCurriculum(state.sheets.find((sheet) => sheet.id === row.sheetId)?.curriculumId, activeCurriculum)), [state, activeCurriculum]);

  return (
    <div>
      <PageHeader title="Exam Marks" description="View and manage exam marks." />
      <Card className="list-scroll-container overflow-x-auto">
        <table className="data-table min-w-[720px]"><thead><tr><th>Student</th><th>Subject</th><th>Exam</th><th>Score</th><th>Status</th></tr></thead>
          <tbody>{rows.length ? rows.map((row) => <tr key={row.id}><td>{row.student}</td><td>{row.subject}</td><td>{row.exam}</td><td className="font-semibold">{row.score ?? "Not entered"}</td><td>{row.pending ? <Badge variant="outline">Pending sync</Badge> : <Badge>Saved</Badge>}</td></tr>) : <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">No marks entered for this curriculum yet. Enter results from Mark Entry.</td></tr>}</tbody>
        </table>
      </Card>
    </div>
  );
}
