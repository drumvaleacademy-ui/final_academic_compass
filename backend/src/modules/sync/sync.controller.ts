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
    try {
      return await this.syncService.mergeSnapshot(req.user.schoolId, payload);
    } catch (err) {
      // Log error server-side for debugging and return a clearer message to client
      console.error('[sync] mergeSnapshot failed for schoolId=', req.user?.schoolId, err);
      // Throw a NestJS error with the original message so client can see details
      throw new (require('@nestjs/common').InternalServerErrorException)(err?.message ?? 'Sync failed');
    }
  }
}
