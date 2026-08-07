import { Controller, Get, Patch, Param, Body, UseGuards, Request, HttpCode, HttpStatus, Query } from "@nestjs/common";
import { ConflictsService } from "./conflicts.service";
import { AuthGuard } from "../../core/guards/nestjs.guards";

@Controller("conflicts")
export class ConflictsController {
  constructor(private readonly conflictsService: ConflictsService) {}

  @Get()
  @UseGuards(AuthGuard)
  async findAll(@Request() req: any, @Query("status") status?: string) {
    return this.conflictsService.findAll(req.user.schoolId, status);
  }

  @Patch(":id")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async resolve(@Request() req: any, @Param("id") id: string, @Body() body: any) {
    return this.conflictsService.resolve(req.user.schoolId, id, body.resolution, body.customValue);
  }
}
