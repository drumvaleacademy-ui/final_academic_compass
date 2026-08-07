import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma.module";
import { MarksService } from "./marks.service";
import { MarksController } from "./marks.controller";

@Module({
  imports: [PrismaModule],
  controllers: [MarksController],
  providers: [MarksService],
})
export class MarksModule {}
