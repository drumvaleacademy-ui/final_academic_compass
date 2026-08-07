import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [],
  providers: [],
})
export class ImportsModule {}
