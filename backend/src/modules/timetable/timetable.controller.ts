import { Controller, Get, Post, Patch, Delete, Body, UseGuards, Request, Param, HttpCode, HttpStatus } from "@nestjs/common";
import { TimetableService } from "./timetable.service";
import { AuthGuard } from "../../core/guards/nestjs.guards";

@Controller("timetable")
export class TimetableController {
  constructor(private readonly timetableService: TimetableService) {}

  @Get()
  @UseGuards(AuthGuard)
  async findAll(@Request() req: any) {
    return this.timetableService.findAll(req.user.schoolId);
  }

  @Post()
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async upsert(@Request() req: any, @Body() data: any) {
    return this.timetableService.upsert(req.user.schoolId, req.user.id, data);
  }

  @Post("batch")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async batchUpsert(@Request() req: any, @Body() body: any) {
    return this.timetableService.batchUpsert(req.user.schoolId, req.user.id, body.slots || []);
  }

  @Delete(":id")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async remove(@Request() req: any, @Param("id") id: string) {
    return this.timetableService.remove(req.user.schoolId, id);
  }
}
