import { Request, Response, NextFunction } from "express";
import { prisma } from "../prisma.service";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    fullName: string;
    schoolId: string;
    roles: string[];
    isActive: boolean;
  };
}

export const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ message: "Missing or invalid authorization header" });
      return;
    }

    const token = authHeader.slice(7);
    const decoded = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString()) as any;

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      include: { roles: true },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ message: "Invalid or inactive user" });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      schoolId: user.schoolId,
      roles: user.roles.map((r: { role: string }) => r.role),
      isActive: user.isActive,
    };

    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};

export const requireRole = (...allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const hasRole = allowedRoles.some((role) => req.user!.roles.includes(role));
    if (!hasRole) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    next();
  };
};

export const requireSchoolMatch = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const schoolId = req.params.schoolId || req.body?.schoolId;
  if (!schoolId || schoolId !== req.user?.schoolId) {
    res.status(403).json({ message: "School mismatch" });
    return;
  }
  next();
};
