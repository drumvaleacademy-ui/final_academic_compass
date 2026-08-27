import { Controller, Get, Post, Body, UseGuards, Request, HttpCode, HttpStatus, Delete, Param } from "@nestjs/common";
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
      // Safely extract message from unknown error
      const msg = err && typeof (err as any)?.message === 'string' ? (err as any).message : 'Sync failed';
      // Throw a NestJS error with the derived message so client can see details
      throw new (require('@nestjs/common').InternalServerErrorException)(msg);
    }
  }

  @Delete("entity/:entity/:id")
  @UseGuards(AuthGuard)
  async deleteEntity(@Request() req: any, @Param("entity") entity: string, @Param("id") id: string) {
    return this.syncService.deleteEntity(req.user.schoolId, entity, id);
  }
}
