import { Injectable, CanActivate, ExecutionContext, ForbiddenException, SetMetadata } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { prisma, PrismaService } from "../../core/prisma.service";
import jwt from "jsonwebtoken";

export const ROLES_KEY = "roles";
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      throw new ForbiddenException("Missing or invalid authorization header");
    }

    const token = authHeader.slice(7);
    try {
      const decoded = jwt.verify(token, process.env.SESSION_SECRET ?? "dev-secret-change-me") as { sub: string };
      const user = await (prisma as any).user.findUnique({
        where: { id: decoded.sub },
        include: { roles: true },
      });

      if (!user || !user.isActive) {
        throw new ForbiddenException("Invalid or inactive user");
      }

      request.user = {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        schoolId: user.schoolId,
        roles: user.roles.map((r: { role: string }) => r.role),
        isActive: user.isActive,
      };
      return true;
    } catch {
      throw new ForbiddenException("Invalid token");
    }
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException("Unauthorized");
    }

    const allowedRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!allowedRoles || allowedRoles.length === 0) {
      return true;
    }

    const hasRole = allowedRoles.some((role) => user.roles.includes(role));
    if (!hasRole) {
      throw new ForbiddenException("Forbidden");
    }

    return true;
  }
}
