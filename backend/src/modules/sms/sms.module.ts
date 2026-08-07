import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma.module";
import { SmsService } from "./sms.service";
import { SmsController } from "./sms.controller";

@Module({
  imports: [PrismaModule],
  controllers: [SmsController],
  providers: [SmsService],
})
export class SmsModule {}
