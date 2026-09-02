import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma.module";
import { SchoolDataController } from "./school-data.controller";
import { SchoolDataService } from "./school-data.service";

@Module({
  imports: [PrismaModule],
  controllers: [SchoolDataController],
  providers: [SchoolDataService],
})
export class SchoolDataModule {}