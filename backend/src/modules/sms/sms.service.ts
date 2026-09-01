import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../core/prisma.service";
import { SmsProvider } from "./sms.provider";
import { SafravoSmsProvider } from "./safravo.provider";

@Injectable()
export class SmsService {
  private provider: SmsProvider;

  constructor(private readonly prisma: PrismaService) {
    this.provider = new SafravoSmsProvider();
  }

  async sendReportCard(params: { schoolId: string; studentId: string; message: string; reportUrl?: string; triggeredBy: string }) {
    const recipients = await this.prisma.$queryRaw<Array<{ phone: string | null }>>`
      SELECT COALESCE(NULLIF(p."phoneNumbers"[1], ''), NULLIF(p."phoneNumbers"[0], ''), u."phoneNumber") AS phone
      FROM "student_parents" sp
      JOIN "parents" p ON p."id" = sp."parentId"
      LEFT JOIN "users" u ON u."id" = p."userId"
      JOIN "students" s ON s."id" = sp."studentId"
      WHERE sp."studentId" = ${params.studentId} AND s."schoolId" = ${params.schoolId}
      ORDER BY sp."createdAt" ASC
      LIMIT 1
    `;
    const recipient = recipients[0]?.phone?.trim();
    if (!recipient) throw new BadRequestException("No parent phone number is registered for this student");

    return this.sendSms({
      schoolId: params.schoolId,
      recipient,
      message: params.reportUrl ? `${params.message} Final result slip: ${params.reportUrl}` : params.message,
      recipientType: "PARENT",
      triggeredBy: params.triggeredBy,
    });
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

    if (!result.success) {
      throw new BadRequestException(result.error || "SMS provider rejected the message");
    }

    return {
      success: true,
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
