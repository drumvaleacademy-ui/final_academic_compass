import { Controller, Get, Post, Body, UseGuards, Request, HttpCode, HttpStatus } from "@nestjs/common";
import { MarksService } from "./marks.service";
import { AuthGuard } from "../../core/guards/nestjs.guards";

@Controller("marks")
export class MarksController {
  constructor(private readonly marksService: MarksService) {}

  @Get()
  @UseGuards(AuthGuard)
  async findAll(@Request() req: any) {
    return this.marksService.findAll(req.user.schoolId);
  }

  @Post()
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async upsert(@Request() req: any, @Body() data: any) {
    return this.marksService.upsert(req.user.schoolId, req.user.id, data);
  }

  @Post("batch")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async batchUpsert(@Request() req: any, @Body() body: any) {
    return this.marksService.batchUpsert(req.user.schoolId, req.user.id, body.entries || []);
  }
}
