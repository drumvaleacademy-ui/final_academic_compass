import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../core/prisma.service";

const DEFAULT_CURRICULA = [
  { id: "cbc", name: "CBC", shortName: "CBC", description: "Competency-Based Curriculum" },
  { id: "844", name: "844", shortName: "844", description: "8-4-4 System" },
];

@Injectable()
export class SchoolDataService {
  constructor(private readonly prisma: PrismaService) {}

  async get(schoolId: string) {
    const db: any = this.prisma;
    const school = await db.school.findUnique({ where: { id: schoolId }, include: { settings: true } });
    if (!school) return { data: null };

    const [classes, subjects, students, exams, sheets, entries, timetable, users] = await Promise.all([
      db.class.findMany({ where: { schoolId }, include: { streams: true } }),
      db.subject.findMany({ where: { schoolId } }),
      db.student.findMany({ where: { schoolId }, include: { class: true } }),
      db.exam.findMany({ where: { schoolId }, include: { term: true } }),
      db.markSheet.findMany({ where: { class: { schoolId } } }),
      db.markEntry.findMany({ where: { sheet: { class: { schoolId } } } }),
      db.timetableSlot.findMany({ where: { schoolId }, include: { class: true } }),
      db.user.findMany({ where: { schoolId }, include: { roles: true } }),
    ]);
    const settings = school.settings;

    return {
      data: {
        classes: classes.map((item: any) => ({ id: item.id, curriculumId: item.curriculumId, name: item.name })),
        streams: classes.flatMap((item: any) => item.streams.map((stream: any) => ({ id: stream.id, classId: stream.classId, name: stream.name }))),
        subjects: subjects.map((item: any) => ({ id: item.id, curriculumId: item.curriculumId, name: item.name, code: item.code })),
        students: students.map((item: any) => ({ id: item.id, curriculumId: item.class?.curriculumId ?? "cbc", admissionNo: item.admissionNo, name: item.fullName, gender: item.gender, guardianName: item.guardianName, guardianPhone: item.guardianPhone, guardianEmail: item.guardianEmail, classId: item.classId, streamId: item.streamId })),
        exams: exams.map((item: any) => ({ id: item.id, curriculumId: item.curriculumId, name: item.name, term: Number(item.term?.name?.replace(/\D/g, "")) || 1, year: item.year, outOf: item.outOf, status: item.status, startDate: item.term?.startDate?.toISOString?.(), endDate: item.term?.endDate?.toISOString?.() })),
        sheets: sheets.map((item: any) => ({ id: item.id, curriculumId: item.curriculumId, classId: item.classId, streamId: item.streamId, subjectId: item.subjectId, examId: item.examId, status: item.status, locked: item.locked, teacherComment: item.comment, teacherId: item.teacherId })),
        entries: entries.map((item: any) => ({ id: item.id, sheetId: item.sheetId, studentId: item.studentId, score: item.score, updatedAt: item.updatedAt, updatedBy: item.updatedBy, pending: false })),
        timetable: timetable.map((item: any) => ({ id: item.id, curriculumId: item.class?.curriculumId ?? "cbc", classId: item.classId, streamId: item.streamId, dayOfWeek: item.dayOfWeek, period: item.period, startTime: item.startTime, endTime: item.endTime, subjectId: item.subjectId, teacherId: item.teacherId, room: item.room, pending: false })),
        teachers: users.map((item: any) => ({ id: item.id, name: item.fullName, email: item.email, curriculumIds: DEFAULT_CURRICULA.map((curriculum) => curriculum.id), role: item.roles?.[0]?.role })),
        curricula: settings?.curricula ?? DEFAULT_CURRICULA,
        settings: settings ? { schoolName: settings.schoolName ?? school.name, schoolTag: settings.schoolTag ?? "", schoolAddress: settings.schoolAddress ?? "", schoolEmail: settings.schoolEmail ?? "", schoolWebsite: settings.schoolWebsite ?? "", schoolMotto: settings.schoolMotto ?? school.motto ?? "", schoolVision: settings.schoolVision ?? "", schoolMission: settings.schoolMission ?? "", principalName: settings.principalName ?? "", principalTitle: settings.principalTitle ?? "", academicYear: settings.academicYear ?? new Date().getFullYear() } : null,
      },
    };
  }
}