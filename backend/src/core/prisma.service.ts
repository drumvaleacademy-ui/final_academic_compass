import { PrismaClient } from "@prisma/client";

export class PrismaService extends PrismaClient {
  constructor() {
    super({
      log: ["query", "error", "warn"],
    });
  }
}

export const prisma = new PrismaService();

export type PrismaTransaction = Parameters<typeof prisma.$transaction>[0];
