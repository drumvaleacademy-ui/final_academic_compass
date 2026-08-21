import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../core/prisma.service";

const DEFAULT_CURRICULA = [
  { id: "cbc", name: "CBC", shortName: "CBC", description: "Competency-Based Curriculum" },
  { id: "844", name: "844", shortName: "844", description: "8-4-4 System" },
];

@Injectable()
export class SyncService {
  constructor(private readonly prisma: PrismaService) {}

  async getSchoolSnapshot(schoolId: string) {
    const db: any = this.prisma;
    const school = await db.school.findUnique({ where: { id: schoolId }, include: { settings: true } });
    if (!school) return { data: null, updatedAt: null };

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
        students: students.map((item: any) => ({ id: item.id, curriculumId: item.class?.curriculumId ?? "cbc", admissionNo: item.admissionNo, name: item.fullName, gender: item.gender, classId: item.classId, streamId: item.streamId })),
        exams: exams.map((item: any) => ({ id: item.id, curriculumId: item.curriculumId, name: item.name, term: Number(item.term?.name?.replace(/\D/g, "")) || 1, year: item.year, outOf: item.outOf, status: item.status })),
        sheets: sheets.map((item: any) => ({ id: item.id, curriculumId: item.curriculumId, classId: item.classId, streamId: item.streamId, subjectId: item.subjectId, examId: item.examId, status: item.status, locked: item.locked, teacherComment: item.comment, teacherId: item.teacherId })),
        entries: entries.map((item: any) => ({ id: item.id, sheetId: item.sheetId, studentId: item.studentId, score: item.score, updatedAt: item.updatedAt, updatedBy: item.updatedBy, pending: false })),
        timetable: timetable.map((item: any) => ({ id: item.id, curriculumId: item.class?.curriculumId ?? "cbc", classId: item.classId, streamId: item.streamId, dayOfWeek: item.dayOfWeek, period: item.period, startTime: item.startTime, endTime: item.endTime, subjectId: item.subjectId, teacherId: item.teacherId, room: item.room, pending: false })),
        teachers: users.map((item: any) => ({ id: item.id, name: item.fullName, email: item.email, curriculumIds: DEFAULT_CURRICULA.map((curriculum) => curriculum.id), role: item.roles?.[0]?.role })),
        curricula: settings?.curricula ?? DEFAULT_CURRICULA,
        settings: settings ? {
          schoolName: settings.schoolName ?? school.name,
          schoolTag: settings.schoolTag ?? "",
          schoolAddress: settings.schoolAddress ?? "",
          schoolEmail: settings.schoolEmail ?? "",
          schoolWebsite: settings.schoolWebsite ?? "",
          schoolMotto: settings.schoolMotto ?? school.motto ?? "",
          schoolVision: settings.schoolVision ?? "",
          schoolMission: settings.schoolMission ?? "",
          principalName: settings.principalName ?? "",
          principalTitle: settings.principalTitle ?? "",
          academicYear: settings.academicYear ?? new Date().getFullYear(),
        } : null,
        classRemarks: [], principalRemarks: [], deletedIds: [],
      },
      updatedAt: settings?.updatedAt ?? school.updatedAt,
    };
  }

  async mergeSnapshot(schoolId: string, payload: any) {
    const current = await this.getSchoolSnapshot(schoolId);
    const merged = this.mergeSnapshots(current.data, payload);
    const now = new Date();
    const db: any = this.prisma;

    await db.$transaction(async (tx: any) => {
      const deletedIds = (merged.deletedIds ?? []).map(String);
      if (deletedIds.length) {
        await tx.markEntry.deleteMany({ where: { id: { in: deletedIds } } });
        await tx.markSheet.deleteMany({ where: { id: { in: deletedIds } } });
        await tx.student.deleteMany({ where: { id: { in: deletedIds }, schoolId } });
        await tx.timetableSlot.deleteMany({ where: { id: { in: deletedIds }, schoolId } });
        await tx.stream.deleteMany({ where: { id: { in: deletedIds } } });
        await tx.class.deleteMany({ where: { id: { in: deletedIds }, schoolId } });
        await tx.exam.deleteMany({ where: { id: { in: deletedIds }, schoolId } });
        await tx.subject.deleteMany({ where: { id: { in: deletedIds }, schoolId } });
      }

      for (const item of merged.classes ?? []) {
        await tx.class.upsert({
          where: { id: item.id },
          update: { name: item.name, curriculumId: item.curriculumId ?? "cbc", isActive: true },
          create: { id: item.id, schoolId, name: item.name, level: Number.parseInt(String(item.name).replace(/\D/g, ""), 10) || 0, curriculumId: item.curriculumId ?? "cbc" },
        });
      }
      for (const item of merged.streams ?? []) {
        await tx.stream.upsert({
          where: { id: item.id },
          update: { name: item.name, classId: item.classId },
          create: { id: item.id, name: item.name, classId: item.classId },
        });
      }
      for (const item of merged.subjects ?? []) {
        await tx.subject.upsert({
          where: { id: item.id },
          update: { name: item.name, code: item.code ?? item.name, curriculumId: item.curriculumId ?? "cbc" },
          create: { id: item.id, schoolId, name: item.name, code: item.code ?? item.name, curriculumId: item.curriculumId ?? "cbc" },
        });
      }
      for (const item of merged.students ?? []) {
        await tx.student.upsert({
          where: { id: item.id },
          update: { admissionNo: item.admissionNo, fullName: item.name, gender: item.gender, classId: item.classId, streamId: item.streamId, isActive: true },
          create: { id: item.id, schoolId, admissionNo: item.admissionNo, fullName: item.name, gender: item.gender, classId: item.classId, streamId: item.streamId },
        });
      }
      for (const item of merged.exams ?? []) {
        const termNumber = Number(item.term) || 1;
        const termId = `term_${schoolId}_${item.year}_${termNumber}`;
        await tx.term.upsert({
          where: { id: termId },
          update: { name: `Term ${termNumber}`, startDate: new Date(`${item.year}-01-01`), endDate: new Date(`${item.year}-12-31`) },
          create: { id: termId, schoolId, name: `Term ${termNumber}`, startDate: new Date(`${item.year}-01-01`), endDate: new Date(`${item.year}-12-31`) },
        });
        await tx.exam.upsert({
          where: { id: item.id },
          update: { name: item.name, year: item.year, outOf: item.outOf, status: item.status, classId: item.classId ?? merged.classes?.[0]?.id, termId, curriculumId: item.curriculumId ?? "cbc" },
          create: { id: item.id, schoolId, name: item.name, year: item.year, outOf: item.outOf, status: item.status, classId: item.classId ?? merged.classes?.[0]?.id, termId, curriculumId: item.curriculumId ?? "cbc" },
        });
      }
      for (const item of merged.sheets ?? []) {
        await tx.markSheet.upsert({
          where: { id: item.id },
          update: { examId: item.examId, classId: item.classId, streamId: item.streamId, subjectId: item.subjectId, teacherId: item.teacherId ?? "system", status: item.status, locked: Boolean(item.locked), comment: item.teacherComment ?? null, curriculumId: item.curriculumId ?? "cbc" },
          create: { id: item.id, examId: item.examId, classId: item.classId, streamId: item.streamId, subjectId: item.subjectId, teacherId: item.teacherId ?? "system", status: item.status ?? "draft", locked: Boolean(item.locked), comment: item.teacherComment ?? null, curriculumId: item.curriculumId ?? "cbc" },
        });
      }
      for (const item of merged.entries ?? []) {
        await tx.markEntry.upsert({
          where: { id: item.id },
          update: { sheetId: item.sheetId, studentId: item.studentId, score: item.score, updatedBy: item.updatedBy ?? "system" },
          create: { id: item.id, sheetId: item.sheetId, studentId: item.studentId, score: item.score, updatedBy: item.updatedBy ?? "system" },
        });
      }
      for (const item of merged.timetable ?? []) {
        await tx.timetableSlot.upsert({
          where: { id: item.id },
          update: { classId: item.classId, streamId: item.streamId ?? null, dayOfWeek: item.dayOfWeek, period: item.period, startTime: item.startTime ?? "", endTime: item.endTime ?? "", subjectId: item.subjectId ?? null, teacherId: item.teacherId ?? null, room: item.room ?? null },
          create: { id: item.id, schoolId, classId: item.classId, streamId: item.streamId ?? null, dayOfWeek: item.dayOfWeek, period: item.period, startTime: item.startTime ?? "", endTime: item.endTime ?? "", subjectId: item.subjectId ?? null, teacherId: item.teacherId ?? null, room: item.room ?? null },
        });
      }

      const settings = merged.settings ?? {};
      await tx.schoolSettings.upsert({
        where: { schoolId },
        update: { ...settings, curricula: merged.curricula ?? [] },
        create: { schoolId, ...settings, curricula: merged.curricula ?? [] },
      });
      if (settings.schoolName) {
        await tx.school.update({ where: { id: schoolId }, data: { name: settings.schoolName, motto: settings.schoolMotto ?? null } });
      }
    });

    return { data: merged, updatedAt: now.toISOString() };
  }

  private mergeSnapshots(remote: any, local: any): any {
    if (!remote) return local;
    if (!local) return remote;

    const deleted = new Set([
      ...(remote.deletedIds ?? []),
      ...(local.deletedIds ?? []),
    ].map(String));

    const merged = { ...remote, deletedIds: Array.from(deleted) };
    const arrays = ["students", "teachers", "classes", "streams", "subjects", "exams", "sheets", "entries", "timetable"];
    for (const key of arrays) {
      const remoteArr = Array.isArray(remote[key]) ? remote[key] : [];
      const localArr = Array.isArray(local[key]) ? local[key] : [];
      const map = new Map<string, any>();
      for (const item of [...remoteArr, ...localArr]) {
        if (!item?.id) continue;
        if (deleted.has(String(item.id))) continue;
        const existing = map.get(item.id);
        if (!existing || (item.updatedAt && (!existing.updatedAt || item.updatedAt > existing.updatedAt))) {
          map.set(item.id, item);
        }
      }
      merged[key] = Array.from(map.values()).sort((a: any, b: any) => (a.updatedAt ?? 0) - (b.updatedAt ?? 0));
    }
    const scalarObjects = ["settings", "curricula"];
    for (const key of scalarObjects) {
      if (local[key] && (!remote[key] || (local[key].updatedAt ?? 0) > (remote[key]?.updatedAt ?? 0))) {
        merged[key] = local[key];
      }
    }
    if (local.settings) merged.settings = { ...remote.settings, ...local.settings };
    return merged;
  }
}
