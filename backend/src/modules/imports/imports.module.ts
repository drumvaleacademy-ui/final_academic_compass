import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma.module";
import { ImportsService } from "./imports.service";
import { ImportsController } from "./imports.controller";

@Module({
  imports: [PrismaModule],
  controllers: [ImportsController],
  providers: [ImportsService],
})
export class ImportsModule {}
