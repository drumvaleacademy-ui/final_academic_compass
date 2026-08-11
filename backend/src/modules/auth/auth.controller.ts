import { Controller, Post, Get, Delete, Body, UseGuards, Req, HttpCode, HttpStatus, Param, Query } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthGuard, RolesGuard, Roles } from "../../core/guards/nestjs.guards";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("signin")
  @HttpCode(HttpStatus.OK)
  async signin(@Body() input: any) {
    return this.authService.signin(input);
  }

  @Post("bootstrap")
  @HttpCode(HttpStatus.CREATED)
  async bootstrap(@Body() input: any) {
    return this.authService.bootstrap(input);
  }

  @Post("supabase-callback")
  @HttpCode(HttpStatus.OK)
  async supabaseCallback(@Body() input: any) {
    return this.authService.supabaseCallback(input);
  }

   @Get("me")
  @UseGuards(AuthGuard)
  async me(@Req() req: any) {
    return this.authService.me(req.user.id);
  }

  @Get("roles")
  @UseGuards(AuthGuard)
  async roles(@Req() req: any) {
    return this.authService.getRoles(req.user.id);
  }

  @Get("profiles")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("PLATFORM_ADMIN", "PRINCIPAL")
  async profiles(@Req() req: any) {
    return this.authService.listProfiles(req.user.schoolId);
  }

  @Delete("profiles/:id")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("PLATFORM_ADMIN", "PRINCIPAL")
  @HttpCode(HttpStatus.OK)
  async deleteProfile(@Req() req: any, @Param("id") id: string) {
    return this.authService.deleteProfile(req.user.schoolId, id);
  }

  @Post("set-approval")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("PLATFORM_ADMIN", "PRINCIPAL")
  @HttpCode(HttpStatus.OK)
  async setApproval(@Req() req: any, @Body() body: any) {
    return this.authService.setApproval(req.user.schoolId, body.userId, body.approved);
  }

  @Post("assign-role")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("PLATFORM_ADMIN", "PRINCIPAL")
  @HttpCode(HttpStatus.OK)
  async assignRole(@Req() req: any, @Body() body: any) {
    return this.authService.assignRole(req.user.schoolId, body.userId, body.role, body.action);
  }

   @Post("forgot-password")
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() input: any) {
    return this.authService.forgotPassword(input);
  }

  @Post("change-password")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(@Req() req: any, @Body() body: any) {
    return this.authService.changePassword(req.user.id, body.currentPassword, body.newPassword);
  }

  @Post("admin-reset-password")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("PLATFORM_ADMIN", "PRINCIPAL")
  @HttpCode(HttpStatus.OK)
  async adminResetPassword(@Req() req: any, @Body() body: any) {
    return this.authService.adminResetPassword(body.userId, body.newPassword, req.user.schoolId);
  }

   @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() input: any) {
    return this.authService.resetPassword(input);
  }

  @Get("verify-reset-token")
  async verifyResetToken(@Query("token") token: string) {
    return this.authService.verifyResetToken(token);
  }


  @Post("teachers")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("PLATFORM_ADMIN", "PRINCIPAL")
  @HttpCode(HttpStatus.CREATED)
  async createTeacher(@Req() req: any, @Body() input: any) {
    return this.authService.createTeacher(req.user.schoolId, {
      ...input,
      fullName: input.fullName ?? input.full_name,
      role: input.role === "subject_teacher" ? "TEACHER" : input.role,
    }, req.user.id);
  }

  @Post("activate")
  @HttpCode(HttpStatus.OK)
  async activate(@Body("token") token: string) {
    return this.authService.activateUser(token);
  }
}
