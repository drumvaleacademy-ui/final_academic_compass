import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../../core/prisma.service";

@Injectable()
export class MarksService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(schoolId: string) {
    const entries = await this.prisma.db.markEntry.findMany({
      where: {
        sheet: {
          exam: {
            schoolId,
          },
        },
      },
      include: {
        sheet: {
          include: {
            exam: true,
            class: true,
            stream: true,
            subject: true,
          },
        },
        student: true,
      },
      orderBy: { updatedAt: "desc" },
    }) as any[];

    return entries.map((entry: any) => ({
      id: entry.id,
      sheetId: entry.sheetId,
      studentId: entry.studentId,
      score: entry.score,
      updatedAt: entry.updatedAt,
      updatedBy: entry.updatedBy,
      sheet: entry.sheet,
      student: entry.student,
    }));
  }

  async upsert(schoolId: string, userId: string, data: {
    id?: string;
    sheetId: string;
    studentId: string;
    score: number | null;
  }) {
    const sheet = await this.prisma.db.markSheet.findFirst({
      where: {
        id: data.sheetId,
        exam: { schoolId },
      },
      include: { exam: true },
    });

    if (!sheet) {
      throw new NotFoundException("Mark sheet not found");
    }

    const entry = await this.prisma.db.markEntry.upsert({
      where: { id: data.id || "" },
      update: {
        score: data.score,
        updatedBy: userId,
      },
      create: {
        sheetId: data.sheetId,
        studentId: data.studentId,
        score: data.score,
        updatedBy: userId,
      },
    });

    return {
      id: entry.id,
      status: "ok" as const,
    };
  }

  async batchUpsert(schoolId: string, userId: string, entries: Array<{
    id?: string;
    sheetId: string;
    studentId: string;
    score: number | null;
  }>) {
    const results = [];
    for (const entry of entries) {
      try {
        const result = await this.upsert(schoolId, userId, entry);
        results.push(result);
      } catch {
        results.push({ id: entry.id, status: "error" as const });
      }
    }
    return { results };
  }
}
