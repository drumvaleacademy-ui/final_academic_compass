import { PrismaClient } from "@prisma/client";

export class PrismaService extends PrismaClient {
  constructor() {
    super({
      log: ["query", "error", "warn"],
    });
  }
}

// Lazy singleton — instantiated on first use, not at module load time.
// This prevents the function from crashing at startup if DATABASE_URL is missing.
let _prisma: PrismaService | null = null;

export function getPrisma(): PrismaService {
  if (!_prisma) {
    _prisma = new PrismaService();
  }
  return _prisma;
}

// Keep the named export for backwards compatibility with guards/services that import `prisma` directly
export const prisma: PrismaService = new Proxy({} as PrismaService, {
  get(_target, prop) {
    return (getPrisma() as any)[prop];
  },
});

export type PrismaTransaction = Parameters<typeof prisma.$transaction>[0];
