import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../core/prisma.service";

@Injectable()
export class ParentsService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizePhones(value: unknown): string[] {
    const raw = Array.isArray(value)
      ? value
      : typeof value === "string"
        ? [value]
        : [];

    return Array.from(
      new Set(
        raw
          .map((item) => String(item ?? "").trim())
          .filter((phone) => phone.length > 0)
      )
    );
  }

  async findAll(schoolId: string) {
    const db: any = this.prisma;
    const parents = await db.parent.findMany({
      where: { schoolId },
      include: { children: { select: { studentId: true, relationship: true, isPrimary: true } } },
      orderBy: { fullName: "asc" },
    });

    return parents.map((parent: any) => ({
      id: parent.id,
      schoolId: parent.schoolId,
      fullName: parent.fullName ?? "",
      email: parent.email ?? "",
      relationship: parent.relationship ?? "Parent",
      phoneNumbers: Array.isArray(parent.phoneNumbers) ? parent.phoneNumbers.filter(Boolean) : [],
      studentIds: parent.children.map((link: any) => link.studentId),
      userId: parent.userId,
      createdBy: parent.createdBy,
    }));
  }

  async upsert(schoolId: string, userId: string, payload: any) {
    const db: any = this.prisma;
    const rawParent = payload ?? {};
    const parentId = typeof rawParent.id === "string" && rawParent.id.trim() ? rawParent.id : undefined;
    const studentIds = Array.isArray(rawParent.studentIds)
      ? rawParent.studentIds.map((id: any) => String(id)).filter(Boolean)
      : [];
    const phoneNumbers = this.normalizePhones(rawParent.phoneNumbers ?? rawParent.phoneNumber ?? rawParent.phones);

    const parentData = {
      schoolId,
      fullName: typeof rawParent.fullName === "string" ? rawParent.fullName.trim() : "",
      email: typeof rawParent.email === "string" ? rawParent.email.trim() : "",
      relationship: typeof rawParent.relationship === "string" ? rawParent.relationship.trim() || "Parent" : "Parent",
      phoneNumbers,
      createdBy: rawParent.createdBy ?? userId,
      userId: rawParent.userId ?? null,
    };

    let parent: any;
    if (parentId) {
      parent = await db.parent.upsert({
        where: { id: parentId },
        update: parentData,
        create: { id: parentId, ...parentData },
      });
    } else {
      parent = await db.parent.create({ data: { ...parentData, id: `par_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` } });
    }

    const existingLinks = await db.studentParent.findMany({ where: { parentId: parent.id } });
    const existingSet = new Set(existingLinks.map((link: any) => link.studentId));

    for (const studentId of studentIds) {
      if (!studentId || existingSet.has(studentId)) continue;
      await db.studentParent.create({
        data: {
          id: `sp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          studentId,
          parentId: parent.id,
          relationship: parentData.relationship,
          isPrimary: false,
        },
      });
      existingSet.add(studentId);
    }

    for (const link of existingLinks) {
      if (studentIds.includes(link.studentId)) continue;
      await db.studentParent.deleteMany({ where: { parentId: parent.id, studentId: link.studentId } });
    }

    return this.findOne(parent.id);
  }

  async findOne(id: string) {
    const db: any = this.prisma;
    const parent = await db.parent.findUnique({
      where: { id },
      include: { children: { select: { studentId: true, relationship: true, isPrimary: true } } },
    });

    if (!parent) throw new NotFoundException("Parent not found");

    return {
      id: parent.id,
      schoolId: parent.schoolId,
      fullName: parent.fullName ?? "",
      email: parent.email ?? "",
      relationship: parent.relationship ?? "Parent",
      phoneNumbers: Array.isArray(parent.phoneNumbers) ? parent.phoneNumbers.filter(Boolean) : [],
      studentIds: parent.children.map((link: any) => link.studentId),
      userId: parent.userId,
      createdBy: parent.createdBy,
    };
  }

  async remove(schoolId: string, id: string) {
    const db: any = this.prisma;
    const parent = await db.parent.findFirst({ where: { id, schoolId } });
    if (!parent) throw new NotFoundException("Parent not found");
    await db.studentParent.deleteMany({ where: { parentId: id } });
    await db.parent.delete({ where: { id } });
    return { ok: true };
  }
}
