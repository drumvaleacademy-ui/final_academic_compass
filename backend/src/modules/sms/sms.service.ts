import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../core/prisma.service";
import { SmsProvider } from "./sms.provider";
import { SafravoSmsProvider } from "./safravo.provider";

@Injectable()
export class SmsService {
  private provider: SmsProvider;

  constructor(private readonly prisma: PrismaService) {
    this.provider = new SafravoSmsProvider();
  }

  async sendSms(params: {
    schoolId: string;
    recipient: string;
    message: string;
    recipientType: "PARENT" | "TEACHER" | "ALL";
    recipientIds?: string[];
    triggeredBy: string;
  }) {
    const result = await this.provider.sendSms({
      to: params.recipient,
      message: params.message,
    });

    const log = await this.prisma.db.smsLog.create({
      data: {
        schoolId: params.schoolId,
        recipient: params.recipient,
        message: params.message,
        provider: "safravo",
        status: result.success ? "SENT" : "FAILED",
        providerId: result.providerId,
        error: result.error,
      },
    }) as { id: string };

    return {
      success: result.success,
      logId: log.id,
      providerId: result.providerId,
      error: result.error,
    };
  }

  async getLogs(schoolId: string, limit = 100) {
    const logs = await this.prisma.db.smsLog.findMany({
      where: { schoolId },
      orderBy: { sentAt: "desc" },
      take: limit,
    });

    return logs.map((log: any) => ({
      id: log.id,
      recipient: log.recipient,
      message: log.message,
      provider: log.provider,
      status: log.status,
      providerId: log.providerId,
      error: log.error,
      sentAt: log.sentAt,
    }));
  }
}
