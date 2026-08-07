import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../core/prisma.service";

@Injectable()
export class SyncService {
  constructor(private readonly prisma: PrismaService) {}

  async getSchoolSnapshot(schoolId: string) {
    const snapshot = await this.prisma.school.findUnique({
      where: { id: schoolId },
      include: {
        classes: { include: { streams: true } },
        subjects: true,
        users: { include: { roles: true } },
      },
    });

    if (!snapshot) {
      return { data: null, updatedAt: null };
    }

    return {
      data: snapshot,
      updatedAt: snapshot.updatedAt,
    };
  }

  async mergeSnapshot(schoolId: string, payload: any) {
    const current = await this.getSchoolSnapshot(schoolId);
    const remoteData = current.data;

    const merged = this.mergeSnapshots(remoteData, payload);

    return {
      data: merged,
      updatedAt: new Date().toISOString(),
    };
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
