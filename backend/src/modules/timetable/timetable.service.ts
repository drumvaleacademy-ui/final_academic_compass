import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../core/prisma.service";

@Injectable()
export class TimetableService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(schoolId: string) {
    const slots = await this.prisma.db.timetableSlot.findMany({
      where: { schoolId },
      include: {
        class: true,
        stream: true,
        subject: true,
      },
      orderBy: [{ dayOfWeek: "asc" }, { period: "asc" }],
    });

    return slots.map((slot: any) => ({
      id: slot.id,
      schoolId: slot.schoolId,
      classId: slot.classId,
      streamId: slot.streamId,
      dayOfWeek: slot.dayOfWeek,
      period: slot.period,
      startTime: slot.startTime,
      endTime: slot.endTime,
      subjectId: slot.subjectId,
      teacherId: slot.teacherId,
      room: slot.room,
      createdAt: slot.createdAt,
      updatedAt: slot.updatedAt,
      class: slot.class,
      stream: slot.stream,
      subject: slot.subject,
    }));
  }

  async upsert(schoolId: string, userId: string, data: {
    id?: string;
    classId: string;
    streamId?: string;
    dayOfWeek: number;
    period: number;
    startTime: string;
    endTime: string;
    subjectId?: string;
    teacherId?: string;
    room?: string;
  }) {
    const slot = await this.prisma.db.timetableSlot.upsert({
      where: { id: data.id || "" },
      update: {
        ...data,
        schoolId,
      },
      create: {
        schoolId,
        ...data,
      },
    });

    return {
      id: slot.id,
      status: "ok" as const,
    };
  }

  async batchUpsert(schoolId: string, userId: string, slots: Array<{
    id?: string;
    classId: string;
    streamId?: string;
    dayOfWeek: number;
    period: number;
    startTime: string;
    endTime: string;
    subjectId?: string;
    teacherId?: string;
    room?: string;
  }>) {
    const results = [];
    for (const slot of slots) {
      try {
        const result = await this.upsert(schoolId, userId, slot);
        results.push(result);
      } catch {
        results.push({ id: slot.id, status: "error" as const });
      }
    }
    return { results };
  }

  async remove(schoolId: string, id: string) {
    const slot = await this.prisma.db.timetableSlot.findFirst({
      where: { id, schoolId },
    });

    if (!slot) {
      throw new NotFoundException("Timetable slot not found");
    }

    await this.prisma.db.timetableSlot.delete({ where: { id } });
    return { ok: true };
  }
}
