import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../core/prisma.service";
import { deduplicateStudents, normalizeAdmissionNo } from "./student-identity";

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async remove(schoolId: string, id: string) {
    const student = await this.prisma.db.student.findFirst({ where: { id, schoolId } });
    if (!student) throw new NotFoundException("Student not found");
    await this.prisma.db.student.delete({ where: { id } });
    return { ok: true };
  }

  async import(schoolId: string, students: any[]) {
    const rows = Array.isArray(students) ? deduplicateStudents(students).filter((student) => student?.id && student?.classId && student?.streamId) : [];
    const classes = new Set((await this.prisma.db.class.findMany({ where: { schoolId }, select: { id: true } })).map((item: any) => item.id));
    const streams = new Set((await this.prisma.db.stream.findMany({ where: { class: { schoolId } }, select: { id: true, classId: true } })).map((item: any) => `${item.id}:${item.classId}`));
    const existing = await this.prisma.db.student.findMany({ where: { schoolId }, select: { admissionNo: true } });
    const admissions = new Set(existing.map((item: any) => normalizeAdmissionNo(item.admissionNo)).filter(Boolean));
    const validRows = rows.filter((student) => {
      const admissionNo = normalizeAdmissionNo(student.admissionNo);
      if (!classes.has(student.classId) || !streams.has(`${student.streamId}:${student.classId}`) || !admissionNo || admissions.has(admissionNo)) return false;
      admissions.add(admissionNo);
      return true;
    });
    await this.prisma.db.student.createMany({
      data: validRows.map((student) => ({
        id: String(student.id), schoolId, admissionNo: String(student.admissionNo), fullName: String(student.name ?? "New Student"),
        gender: student.gender === "F" ? "F" : "M", classId: student.classId, streamId: student.streamId,
        guardianName: student.guardianName ?? null, guardianPhone: student.guardianPhone ?? null, guardianEmail: student.guardianEmail ?? null,
      })),
      skipDuplicates: true,
    });
    return { ok: true, count: validRows.length };
  }
}