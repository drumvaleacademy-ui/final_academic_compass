import { Injectable, NotFoundException, ConflictException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../core/prisma.service";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import * as bcrypt from "bcryptjs";
import type { SigninInput, BootstrapInput, ForgotPasswordInput, ResetPasswordInput } from "./dto/auth.dto";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async signin(input: SigninInput) {
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (error || !data.user) {
      throw new BadRequestException("Invalid email or password");
    }

    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
      include: { roles: true },
    });

    if (!user) {
      throw new NotFoundException("User profile not found");
    }

    if (!user.isActive) {
      throw new BadRequestException("Account is inactive");
    }

    const token = Buffer.from(
      JSON.stringify({ sub: user.id, iat: Date.now() })
    ).toString("base64url");

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        roles: user.roles.map((r) => r.role),
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

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: input.adminEmail,
      password: input.adminPassword,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      throw new BadRequestException(authError?.message || "Failed to create admin user");
    }

    const passwordHash = await bcrypt.hash(input.adminPassword, 10);

    const user = await this.prisma.user.create({
      data: {
        id: authData.user.id,
        email: input.adminEmail,
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

    const token = Buffer.from(
      JSON.stringify({ sub: user.id, iat: Date.now() })
    ).toString("base64url");

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        roles: user.roles.map((r) => r.role),
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

  async forgotPassword(input: ForgotPasswordInput) {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      return { message: "If an account exists, a reset link has been sent." };
    }

    const { error } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: input.email,
    });

    if (error) {
      throw new BadRequestException("Failed to generate reset link");
    }

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

    await this.prisma.activationToken.delete({
      where: { id: tokenRecord.id },
    });

    return { message: "Password reset successfully" };
  }

  async createTeacher(schoolId: string, input: {
    email: string;
    fullName: string;
    role?: string;
    department?: string;
    tscEmail?: string;
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
      if (!domain || !allowedDomains.some((d) => d.toLowerCase() === domain)) {
        throw new BadRequestException("Email domain not allowed for teacher registration");
      }
    }

    const tempPassword = randomUUID().slice(0, 12);

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: input.email,
      password: tempPassword,
      email_confirm: false,
    });

    if (authError || !authData.user) {
      throw new BadRequestException(authError?.message || "Failed to create user in Supabase Auth");
    }

    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const user = await this.prisma.user.create({
      data: {
        id: authData.user.id,
        email: input.email,
        fullName: input.fullName,
        passwordHash,
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

    await this.prisma.activationToken.create({
      data: {
        userId: user.id,
        token: randomUUID(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      roles: user.roles.map((r) => r.role),
      tempPassword,
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

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      full_name: u.fullName,
      department: null,
      approved: u.isActive,
      created_at: u.createdAt.toISOString(),
      roles: u.roles.map((r) => r.role),
    }));
  }

  async deleteProfile(schoolId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, schoolId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
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
