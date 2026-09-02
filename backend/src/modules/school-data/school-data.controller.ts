import { Controller, Get, Request, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../../core/guards/nestjs.guards";
import { SchoolDataService } from "./school-data.service";

@Controller("school-data")
export class SchoolDataController {
  constructor(private readonly schoolDataService: SchoolDataService) {}

  @Get()
  @UseGuards(AuthGuard)
  async get(@Request() req: any) {
    return this.schoolDataService.get(req.user.schoolId);
  }
}