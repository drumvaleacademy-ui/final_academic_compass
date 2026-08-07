import { Controller, Post, Get, Body, UseGuards, Req, HttpCode, HttpStatus } from "@nestjs/common";
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

  @Get("me")
  @UseGuards(AuthGuard)
  async me(@Req() req: any) {
    return this.authService.me(req.user.id);
  }

  @Post("forgot-password")
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() input: any) {
    return this.authService.forgotPassword(input);
  }

  @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() input: any) {
    return this.authService.resetPassword(input);
  }

  @Post("teachers")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("PLATFORM_ADMIN", "PRINCIPAL")
  @HttpCode(HttpStatus.CREATED)
  async createTeacher(@Req() req: any, @Body() input: any) {
    return this.authService.createTeacher(req.user.schoolId, input, req.user.id);
  }

  @Post("activate")
  @HttpCode(HttpStatus.OK)
  async activate(@Body("token") token: string) {
    return this.authService.activateUser(token);
  }
}
