import { Body, Controller, Delete, Get, Param, Post, Put, Request, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../../core/guards/nestjs.guards";
import { ParentsService } from "./parents.service";

@Controller("parents")
export class ParentsController {
  constructor(private readonly parentsService: ParentsService) {}

  @Get()
  @UseGuards(AuthGuard)
  async findAll(@Request() req: any) {
    return this.parentsService.findAll(req.user.schoolId);
  }

  @Post()
  @UseGuards(AuthGuard)
  async create(@Request() req: any, @Body() body: any) {
    return this.parentsService.upsert(req.user.schoolId, req.user.id, body);
  }

  @Put(":id")
  @UseGuards(AuthGuard)
  async update(@Request() req: any, @Param("id") id: string, @Body() body: any) {
    return this.parentsService.upsert(req.user.schoolId, req.user.id, { ...body, id });
  }

  @Delete(":id")
  @UseGuards(AuthGuard)
  async remove(@Request() req: any, @Param("id") id: string) {
    return this.parentsService.remove(req.user.schoolId, id);
  }
}
