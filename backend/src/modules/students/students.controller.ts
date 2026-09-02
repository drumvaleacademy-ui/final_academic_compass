import { Controller, Delete, Param, Post, Body, Request, UseGuards, HttpCode, HttpStatus } from "@nestjs/common";
import { AuthGuard } from "../../core/guards/nestjs.guards";
import { StudentsService } from "./students.service";

@Controller("students")
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Delete(":id")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async remove(@Request() req: any, @Param("id") id: string) {
    return this.studentsService.remove(req.user.schoolId, id);
  }

  @Post("import")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async import(@Request() req: any, @Body() body: any) {
    return this.studentsService.import(req.user.schoolId, body?.students ?? []);
  }
}