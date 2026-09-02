import { Controller, Delete, Param, Request, UseGuards, HttpCode, HttpStatus } from "@nestjs/common";
import { AuthGuard } from "../../core/guards/nestjs.guards";
import { ClassesService } from "./classes.service";

@Controller("classes")
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Delete(":id")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async removeClass(@Request() req: any, @Param("id") id: string) {
    return this.classesService.removeClass(req.user.schoolId, id);
  }

  @Delete(":classId/streams/:id")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async removeStream(@Request() req: any, @Param("classId") classId: string, @Param("id") id: string) {
    return this.classesService.removeStream(req.user.schoolId, classId, id);
  }
}