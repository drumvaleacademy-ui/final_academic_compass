import { Controller, Post, Body, UseGuards, Request, HttpCode, HttpStatus } from "@nestjs/common";
import { ImportsService } from "./imports.service";
import { AuthGuard } from "../../core/guards/nestjs.guards";
import { BadRequestException } from "@nestjs/common";

@Controller("imports")
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @Post("marks")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async importMarks(@Request() req: any, @Body() body: any) {
    const rows = Array.isArray(body?.rows) ? body.rows : [];
    const { sheetId, curriculumId } = body || {};

    if (!sheetId || !curriculumId) {
      throw new BadRequestException("sheetId and curriculumId are required");
    }

    return this.importsService.importMarks(req.user.schoolId, req.user.id, rows, sheetId, curriculumId);
  }
}
