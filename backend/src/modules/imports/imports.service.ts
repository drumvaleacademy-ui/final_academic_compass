import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../core/prisma.service";

@Injectable()
export class ImportsService {
  constructor(private readonly prisma: PrismaService) {}

  async importMarks(schoolId: string, userId: string, rows: any[], sheetId: string, curriculumId: string) {
    // Cast to any — Prisma model accessors aren't typed without generated client
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db: any = this.prisma;

    const sheet = await db.markSheet.findFirst({
      where: { id: sheetId, exam: { schoolId } },
      include: { exam: true },
    });

    if (!sheet) {
      throw new NotFoundException("Mark sheet not found");
    }

    const students = await db.student.findMany({
      where: { schoolId },
    });

    const studentsByAdm = new Map(students.map((s: any) => [s.admissionNo, s]));
    const studentsById = new Map(students.map((s: any) => [s.id, s]));

    const entriesToUpsert: any[] = [];
    const errors: any[] = [];
    let imported = 0;
    let conflicts = 0;

    for (const r of rows) {
      const admissionNo = String(r.admissionNo || r.admission_no || "").trim();
      const rawScore = r.score != null && r.score !== "" ? Number(r.score) : null;
      if (!admissionNo) continue;

      const student: any = studentsByAdm.get(admissionNo) || studentsById.get(admissionNo);
      if (!student) {
        errors.push({ admissionNo, error: "Student not found" });
        continue;
      }

      const score = typeof rawScore === "number" && !Number.isNaN(rawScore)
        ? Math.max(0, Math.min(100, rawScore))
        : null;

      const entryId = `e_${sheet.id}_${student.id}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      entriesToUpsert.push({
        id: entryId,
        sheetId: sheet.id,
        studentId: student.id,
        score,
        updatedBy: userId,
      });
    }

    for (const entry of entriesToUpsert) {
      try {
        await db.markEntry.create({ data: entry });
        imported++;
      } catch {
        conflicts++;
      }
    }

    await db.csvImport.create({
      data: {
        schoolId,
        entity: "marks",
        fileName: "import.csv",
        importedBy: userId,
        successCount: imported,
        failureCount: conflicts + errors.length,
        errors: { rows: errors, conflicts },
      },
    });

    return { imported, conflicts, errors, total: rows.length };
  }
}
