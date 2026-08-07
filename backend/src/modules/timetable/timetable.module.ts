import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma.module";
import { TimetableService } from "./timetable.service";
import { TimetableController } from "./timetable.controller";

@Module({
  imports: [PrismaModule],
  controllers: [TimetableController],
  providers: [TimetableService],
})
export class TimetableModule {}
