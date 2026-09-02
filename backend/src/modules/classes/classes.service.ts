import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../core/prisma.service";

@Injectable()
export class ClassesService {
  constructor(private readonly prisma: PrismaService) {}

  async removeClass(schoolId: string, id: string) {
    const item = await this.prisma.db.class.findFirst({ where: { id, schoolId } });
    if (!item) throw new NotFoundException("Class not found");
    await this.prisma.db.class.delete({ where: { id } });
    return { ok: true };
  }

  async removeStream(schoolId: string, classId: string, id: string) {
    const item = await this.prisma.db.stream.findFirst({ where: { id, classId, class: { schoolId } } });
    if (!item) throw new NotFoundException("Stream not found");
    await this.prisma.db.stream.delete({ where: { id } });
    return { ok: true };
  }
}