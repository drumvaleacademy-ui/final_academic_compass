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
      const rows = await this.prisma.$queryRaw<Array<{
        users: string | null;
        userRoles: string | null;
        schools: string | null;
        profiles: string | null;
      }>>`
        SELECT
          to_regclass('public.users') AS users,
          to_regclass('public.user_roles') AS "userRoles",
          to_regclass('public.schools') AS schools,
          to_regclass('public.profiles') AS profiles
      `;
      const schema = rows[0];
      return {
        status: "ok",
        database: "ok",
        schema: {
          users: Boolean(schema?.users),
          userRoles: Boolean(schema?.userRoles),
          schools: Boolean(schema?.schools),
          profiles: Boolean(schema?.profiles),
        },
      };
    } catch (error) {
      console.error("[health] Database check failed", error);
      throw new ServiceUnavailableException("Database unavailable");
    }
  }
}