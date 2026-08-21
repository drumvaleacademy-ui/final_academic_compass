import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../core/prisma.service";

@Injectable()
export class SyncService {
  constructor(private readonly prisma: PrismaService) {}

  async getSchoolSnapshot(schoolId: string) {
    const db: any = this.prisma;

    const snapshot = await db.school.findUnique({
      where: { id: schoolId },
      include: { settings: true },
    });

    if (!snapshot) return { data: null, updatedAt: null };
    const stored = snapshot.settings?.gradingScale;
    if (stored && typeof stored === "object" && stored.snapshotVersion === 1) {
      return { data: stored.snapshot, updatedAt: snapshot.settings.updatedAt };
    }

    return { data: null, updatedAt: snapshot.updatedAt };
  }

  async mergeSnapshot(schoolId: string, payload: any) {
    const current = await this.getSchoolSnapshot(schoolId);
    const merged = this.mergeSnapshots(current.data, payload);
    const now = new Date();
    const db: any = this.prisma;

    await db.$transaction([
      db.schoolSettings.upsert({
        where: { schoolId },
        update: {
          gradingScale: {
            snapshotVersion: 1,
            snapshot: merged,
          },
        },
        create: {
          schoolId,
          gradingScale: {
            snapshotVersion: 1,
            snapshot: merged,
          },
        },
      }),
      ...(merged.settings?.schoolName
        ? [db.school.update({
            where: { id: schoolId },
            data: {
              name: merged.settings.schoolName,
              motto: merged.settings.schoolMotto ?? null,
              email: merged.settings.schoolEmail ?? null,
            },
          })]
        : []),
    ]);

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
    const arrays = ["students", "teachers", "classes", "streams", "subjects", "exams", "sheets"];
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
