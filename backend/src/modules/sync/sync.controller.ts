import { Controller, Get, Post, Body, UseGuards, Request, HttpCode, HttpStatus } from "@nestjs/common";
import { SyncService } from "./sync.service";
import { AuthGuard } from "../../core/guards/nestjs.guards";

@Controller("sync")
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Get()
  @UseGuards(AuthGuard)
  async getSnapshot(@Request() req: any) {
    return this.syncService.getSchoolSnapshot(req.user.schoolId);
  }

  @Post()
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async mergeSnapshot(@Request() req: any, @Body() payload: any) {
    return this.syncService.mergeSnapshot(req.user.schoolId, payload);
  }
}
