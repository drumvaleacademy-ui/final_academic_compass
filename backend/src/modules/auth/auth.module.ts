import { Module } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { PrismaModule } from "../prisma.module";
import { EmailModule } from "../email/email.module";
import { AuthGuard, RolesGuard } from "../../core/guards/nestjs.guards";

@Module({
  imports: [PrismaModule, EmailModule],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, RolesGuard],
})
export class AuthModule {}
