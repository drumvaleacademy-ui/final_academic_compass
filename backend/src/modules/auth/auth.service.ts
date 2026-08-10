import { Injectable, NotFoundException, ConflictException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../core/prisma.service";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import * as bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { EmailService } from "../email/email.service";
import type { SigninInput, BootstrapInput, ForgotPasswordInput, ResetPasswordInput } from "./dto/auth.dto";

const supabaseAdmin =
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } },
      )
    : null;

const JWT_SECRET = process.env.SESSION_SECRET ?? "dev-secret-change-me";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  private generateToken(userId: string): string {
    return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: "30d" });
  }

  private verifyToken(token: string): { sub: string } {
    return jwt.verify(token, JWT_SECRET) as { sub: string };
  }

  async signin(input: SigninInput) {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
      include: { roles: true },
    });

    if (!user) {
      throw new BadRequestException("Invalid email or password");
    }

    if (!user.isActive) {
      throw new BadRequestException("Account is inactive");
    }

    if (user.passwordHash) {
      const ok = await bcrypt.compare(input.password, user.passwordHash);
      if (!ok) {
        throw new BadRequestException("Invalid email or password");
      }
    } else if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin.auth.signInWithPassword({
        email: input.email,
        password: input.password,
      });
      if (error || !data.user) {
        throw new BadRequestException("Invalid email or password");
      }
    } else {
      throw new BadRequestException("Invalid email or password");
    }

    const token = this.generateToken(user.id);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        roles: user.roles.map((r: { role: string }) => r.role),
        schoolId: user.schoolId,
      },
    };
  }

  async bootstrap(input: BootstrapInput) {
    const existingSchool = await this.prisma.school.findFirst();
    if (existingSchool) {
      throw new ConflictException("School already initialized");
    }

    const school = await this.prisma.school.create({
      data: {
        name: input.schoolName,
        code: input.schoolName.toLowerCase().replace(/\s+/g, "-"),
        emailDomains: [],
      },
    });

    const passwordHash = await bcrypt.hash(input.adminPassword, 10);

    let userId: string;
    let userEmail: string;

    if (supabaseAdmin) {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: input.adminEmail,
        password: input.adminPassword,
        email_confirm: true,
      });

      if (authError || !authData.user) {
        throw new BadRequestException(authError?.message || "Failed to create admin user in Supabase Auth");
      }

      userId = authData.user.id;
      userEmail = input.adminEmail;
    } else {
      userId = randomUUID();
      userEmail = input.adminEmail;
    }

    const user = await this.prisma.user.create({
      data: {
        id: userId,
        email: userEmail,
        fullName: input.adminFullName,
        passwordHash,
        schoolId: school.id,
        isActive: true,
        activatedAt: new Date(),
        roles: {
          create: [
            { role: "PLATFORM_ADMIN" },
            { role: "PRINCIPAL" },
          ],
        },
      },
      include: { roles: true },
    });

    await this.emailService.sendWelcomeEmail({
      to: input.adminEmail,
      fullName: input.adminFullName,
      schoolName: school.name,
      loginUrl: `${process.env.FRONTEND_URL ?? "http://localhost:5173"}/auth`,
      password: input.adminPassword,
    });

    const token = this.generateToken(user.id);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        roles: user.roles.map((r: { role: string }) => r.role),
        schoolId: user.schoolId,
      },
      school: {
        id: school.id,
        name: school.name,
      },
    };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      roles: user.roles.map((r) => r.role),
      schoolId: user.schoolId,
    };
  }

  async getRoles(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user.roles.map((r) => r.role);
  }

  async forgotPassword(input: ForgotPasswordInput) {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      return { message: "If an account exists, a reset link has been sent." };
    }

    const nameMatch =
      user.fullName?.toLowerCase().trim() === input.fullName.toLowerCase().trim();

    if (!nameMatch) {
      return { message: "If an account exists, a reset link has been sent." };
    }

    const token = randomUUID();

    await this.prisma.activationToken.deleteMany({
      where: { userId: user.id },
    });

    await this.prisma.activationToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    await this.emailService.sendPasswordResetEmail({
      to: input.email,
      fullName: user.fullName ?? "there",
      resetUrl: `${process.env.FRONTEND_URL ?? "http://localhost:5173"}/auth/reset?token=${token}`,
    });

    return { message: "If an account exists, a reset link has been sent." };
  }

  async resetPassword(input: ResetPasswordInput) {
    const tokenRecord = await this.prisma.activationToken.findUnique({
      where: { token: input.token },
      include: { user: true },
    });

    if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
      throw new BadRequestException("Invalid or expired token");
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    await this.prisma.user.update({
      where: { id: tokenRecord.userId },
      data: { passwordHash, activatedAt: new Date() },
    });

    if (supabaseAdmin) {
      await supabaseAdmin.auth.admin.updateUserById(tokenRecord.userId, {
        password: input.password,
      });
    }

    await this.prisma.activationToken.delete({
      where: { id: tokenRecord.id },
    });

    return { message: "Password reset successfully" };
  }

  async verifyResetToken(token: string) {
    const tokenRecord = await this.prisma.activationToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
      throw new BadRequestException("Invalid or expired token");
    }

    return { valid: true, email: tokenRecord.user.email };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (user.passwordHash) {
      const ok = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!ok) {
        throw new BadRequestException("Current password is incorrect");
      }
    } else if (supabaseAdmin) {
      const { error } = await supabaseAdmin.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (error) {
        throw new BadRequestException("Current password is incorrect");
      }
    } else {
      throw new BadRequestException("Current password is incorrect");
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    if (supabaseAdmin) {
      await supabaseAdmin.auth.admin.updateUserById(userId, { password: newPassword });
    }

    return { message: "Password changed successfully" };
  }

  async adminResetPassword(userId: string, newPassword: string, schoolId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, schoolId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, activatedAt: new Date() },
    });

    if (supabaseAdmin) {
      await supabaseAdmin.auth.admin.updateUserById(userId, { password: newPassword });
    }

    return { message: "Password reset successfully" };
  }

  async createTeacher(schoolId: string, input: {
    email: string;
    fullName: string;
    role?: string;
    department?: string;
    password?: string;
  }, createdBy: string) {
    const existing = await this.prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existing) {
      throw new ConflictException("Email already registered");
    }

    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
    });

    if (!school) {
      throw new NotFoundException("School not found");
    }

    const allowedDomains = school.emailDomains;
    if (allowedDomains && allowedDomains.length > 0) {
      const domain = input.email.split("@")[1]?.toLowerCase();
      if (!domain || !allowedDomains.some((d: string) => d.toLowerCase() === domain)) {
        throw new BadRequestException("Email domain not allowed for teacher registration");
      }
    }

    const tempPassword = input.password || randomUUID().slice(0, 12);
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    let userId: string;

    if (supabaseAdmin) {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: input.email,
        password: tempPassword,
        email_confirm: false,
      });

      if (authError || !authData.user) {
        throw new BadRequestException(authError?.message || "Failed to create user in Supabase Auth");
      }

      userId = authData.user.id;
    } else {
      userId = randomUUID();
    }

    const user = await this.prisma.user.create({
      data: {
        id: userId,
        email: input.email,
        fullName: input.fullName,
        passwordHash,
        phoneNumber: input.department ?? null,
        schoolId,
        isActive: false,
        roles: {
          create: [
            { role: input.role === "SENIOR_TEACHER" ? "SENIOR_TEACHER" : "TEACHER" },
          ],
        },
      },
      include: { roles: true },
    });

    const activationToken = randomUUID();

    await this.prisma.activationToken.create({
      data: {
        userId: user.id,
        token: activationToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:5173";

    await this.emailService.sendWelcomeEmail({
      to: input.email,
      fullName: input.fullName,
      schoolName: school.name,
      loginUrl: `${frontendUrl}/auth`,
      password: tempPassword,
    });

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      roles: user.roles.map((r) => r.role),
      tempPassword,
      activationToken,
    };
  }

  async activateUser(token: string) {
    const tokenRecord = await this.prisma.activationToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
      throw new BadRequestException("Invalid or expired activation token");
    }

    await this.prisma.user.update({
      where: { id: tokenRecord.userId },
      data: { isActive: true, activatedAt: new Date() },
    });

    await this.prisma.activationToken.delete({
      where: { id: tokenRecord.id },
    });

    return { message: "Account activated successfully" };
  }

  async listProfiles(schoolId: string) {
    const users = await this.prisma.user.findMany({
      where: { schoolId },
      include: { roles: true },
      orderBy: { createdAt: "asc" },
    });

    return users.map((u: any) => ({
      id: u.id,
      email: u.email,
      full_name: u.fullName,
      department: u.phoneNumber ?? null,
      approved: u.isActive,
      created_at: u.createdAt.toISOString(),
      roles: u.roles.map((r: { role: string }) => r.role),
    }));
  }

  async deleteProfile(schoolId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, schoolId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (supabaseAdmin) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
    }

    await this.prisma.user.delete({ where: { id: userId } });
    return { ok: true };
  }

  async setApproval(schoolId: string, userId: string, approved: boolean) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, schoolId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: approved, activatedAt: approved ? new Date() : null },
    });

    return { ok: true };
  }

  async assignRole(schoolId: string, userId: string, role: string, action: "add" | "remove") {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, schoolId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (action === "add") {
      await this.prisma.userRole.create({
        data: { userId, role: role as any },
      }).catch(() => {});
    } else {
      await this.prisma.userRole.deleteMany({
        where: { userId, role: role as any },
      });
    }

    return { ok: true };
  }
}
