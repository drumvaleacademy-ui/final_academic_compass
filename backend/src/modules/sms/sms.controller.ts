import { Controller, Post, Get, Body, UseGuards, Request, HttpCode, HttpStatus } from "@nestjs/common";
import { SmsService } from "./sms.service";
import { AuthGuard } from "../../core/guards/nestjs.guards";

@Controller("sms")
export class SmsController {
  constructor(private readonly smsService: SmsService) {}

  @Post("send")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async send(@Request() req: any, @Body() body: any) {
    return this.smsService.sendSms({
      schoolId: req.user.schoolId,
      recipient: body.recipient,
      message: body.message,
      recipientType: body.recipientType || "PARENT",
      recipientIds: body.recipientIds,
      triggeredBy: req.user.id,
    });
  }

  @Get("logs")
  @UseGuards(AuthGuard)
  async logs(@Request() req: any) {
    return this.smsService.getLogs(req.user.schoolId);
  }

  @Post("report-card")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async reportCard(@Request() req: any, @Body() body: any) {
    return this.smsService.sendReportCard({
      schoolId: req.user.schoolId,
      studentId: body.studentId,
      message: body.message,
      reportUrl: body.reportUrl,
      triggeredBy: req.user.id,
    });
  }
}
