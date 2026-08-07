import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma.module";
import { SyncService } from "./sync.service";
import { SyncController } from "./sync.controller";

@Module({
  imports: [PrismaModule],
  controllers: [SyncController],
  providers: [SyncService],
})
export class SyncModule {}
