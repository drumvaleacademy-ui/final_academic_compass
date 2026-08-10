import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../core/prisma.service";

@Injectable()
export class ConflictsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(schoolId: string, status?: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db: any = this.prisma;
    const where: any = { schoolId };
    if (status) where.status = status;

    const conflicts = await db.syncConflict.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return conflicts.map((c: any) => ({
      id: c.id,
      entity: c.entity,
      entityId: c.entityId,
      field: c.field,
      serverValue: c.serverValue,
      incomingValue: c.incomingValue,
      incomingBy: c.incomingBy,
      incomingDevice: c.incomingDevice,
      status: c.status,
      resolution: c.resolution,
      customValue: c.customValue,
      createdAt: c.createdAt,
      resolvedAt: c.resolvedAt,
    }));
  }

  async resolve(schoolId: string, id: string, resolution: string, customValue?: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db: any = this.prisma;

    const conflict = await db.syncConflict.findFirst({ where: { id, schoolId } });
    if (!conflict) throw new NotFoundException("Conflict not found");

    const updated = await db.syncConflict.update({
      where: { id },
      data: {
        status: "resolved",
        resolution,
        customValue: customValue ?? null,
        resolvedAt: new Date(),
      },
    });

    return { id: updated.id, ok: true };
  }
}
