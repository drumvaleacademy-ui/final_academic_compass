import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { PrismaService } from "../../core/prisma.service";

@Controller()
export class RootController {
  @Get()
  root() {
    return { status: "ok", service: "Academic Compass API", docs: "/api/healthz" };
  }
}

@Controller("api")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("healthz")
  health() {
    return { status: "ok" };
  }

  @Get("healthz/db")
  async database() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: "ok", database: "ok" };
    } catch (error) {
      console.error("[health] Database check failed", error);
      throw new ServiceUnavailableException("Database unavailable");
    }
  }
}