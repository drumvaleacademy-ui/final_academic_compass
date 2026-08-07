import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma.module";
import { ConflictsService } from "./conflicts.service";
import { ConflictsController } from "./conflicts.controller";

@Module({
  imports: [PrismaModule],
  controllers: [ConflictsController],
  providers: [ConflictsService],
})
export class ConflictsModule {}
