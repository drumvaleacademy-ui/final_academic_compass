import { Module } from "@nestjs/common";
import { HealthController, RootController } from "./health.controller";
import { PrismaModule } from "../prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [RootController, HealthController],
})
export class HealthModule {}