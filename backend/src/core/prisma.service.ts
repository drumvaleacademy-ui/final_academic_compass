import { PrismaClient } from "@prisma/client";

export class PrismaService extends PrismaClient {
  constructor() {
    super({
      log: ["query", "error", "warn"],
    });
  }

  /**
   * Escape hatch typed as `any` so Prisma model accessors don't cause TS2339
   * errors when the generated client types aren't available at compile time.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get db(): any { return this; }
}

// Lazy singleton — instantiated on first use, not at module load time.
let _prisma: PrismaService | null = null;

export function getPrisma(): PrismaService {
  if (!_prisma) _prisma = new PrismaService();
  return _prisma;
}

// Proxy export so existing code that does `import { prisma }` keeps working
export const prisma: PrismaService = new Proxy({} as PrismaService, {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get(_target, prop) { return (getPrisma() as any)[prop]; },
});

export type PrismaTransaction = Parameters<typeof prisma.$transaction>[0];
