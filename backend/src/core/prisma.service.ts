import { PrismaClient } from "@prisma/client";

function prismaDatabaseUrl() {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) return rawUrl;

  try {
    const url = new URL(rawUrl);
    if (url.port !== "6543") return rawUrl;
    if (!url.searchParams.has("pgbouncer")) url.searchParams.set("pgbouncer", "true");

    const configuredLimit = Number(url.searchParams.get("connection_limit") ?? process.env.PRISMA_CONNECTION_LIMIT ?? "10");
    const safeLimit = Number.isFinite(configuredLimit) && configuredLimit > 1 ? configuredLimit : 10;
    url.searchParams.set("connection_limit", String(safeLimit));
    url.searchParams.set("pool_timeout", "20");
    return url.toString();
  } catch {
    return rawUrl;
  }
}

export class PrismaService extends PrismaClient {
  constructor() {
    super({
      log: ["query", "error", "warn"],
      ...(prismaDatabaseUrl() ? { datasources: { db: { url: prismaDatabaseUrl() } } } : {}),
    });

    Object.defineProperty(this, "db", {
      value: this,
      enumerable: false,
      configurable: true,
      writable: false,
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
