import { Injectable, Logger } from "@nestjs/common";
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

export interface WelcomeEmailParams {
  to: string;
  fullName: string;
  schoolName: string;
  loginUrl: string;
  password?: string;
}

export interface PasswordResetEmailParams {
  to: string;
  fullName: string;
  resetUrl: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;

  private getTransporter(): Transporter | null {
    if (this.transporter) return this.transporter;

    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const secure = process.env.SMTP_SECURE === "true";

    if (!host || !port) {
      this.logger.warn("SMTP_HOST/SMTP_PORT not configured; email sending is disabled (dev mode)");
      this.transporter = null;
      return null;
    }

    const opts: Record<string, unknown> = {
      host,
      port: Number(port),
      secure,
    };
    if (user) (opts.auth as Record<string, string>) = { user, pass: pass ?? "" };

    this.transporter = nodemailer.createTransport(opts as any);
    return this.transporter;
  }

  private get from(): string {
    return process.env.EMAIL_FROM ?? "noreply@academic-compass.co.ke";
  }

  async sendWelcomeEmail(params: WelcomeEmailParams): Promise<boolean> {
    try {
      const transporter = this.getTransporter();
      if (!transporter) {
        this.logger.warn(`Welcome email skipped (no SMTP configured) for ${params.to}`);
        return false;
      }
      const { to, fullName, schoolName, loginUrl, password } = params;

      let html = `
<!doctype html>
<html>
<head><meta charset="utf-8"><title>Welcome to Academic Compass</title></head>
<body style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2>Welcome to Academic Compass, ${fullName}!</h2>
  <p>Your account has been created for <strong>${schoolName}</strong>.</p>
`;

      if (password) {
        html += `<p>Your temporary password is: <strong style="font-size: 1.2em; background: #f5f5f5; padding: 5px 10px; border-radius: 4px;">${password}</strong></p>`;
      }

      html += `
  <p>You can sign in at: <a href="${loginUrl}">${loginUrl}</a></p>
  <p>If you received a temporary password, please change it after your first login.</p>
  <hr style="border: 1px solid #eee; margin: 20px 0;" />
  <p style="font-size: 0.85em; color: #666;">Academic Compass &mdash; School Management Platform</p>
</body>
</html>
`;

      await transporter.sendMail({
        from: this.from,
        to,
        subject: `Welcome to ${schoolName} on Academic Compass`,
        html,
      });

      this.logger.log(`Welcome email sent to ${to}`);
      return true;
    } catch (err) {
      this.logger.error(`Failed to send welcome email to ${params.to}:`, err as Error);
      return false;
    }
  }

  async sendPasswordResetEmail(params: PasswordResetEmailParams): Promise<boolean> {
    try {
      const transporter = this.getTransporter();
      if (!transporter) {
        this.logger.warn(`Password reset email skipped (no SMTP configured) for ${params.to}`);
        return false;
      }
      const { to, fullName, resetUrl } = params;

      const html = `
<!doctype html>
<html>
<head><meta charset="utf-8"><title>Password Reset</title></head>
<body style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2>Password Reset Request</h2>
  <p>Hello ${fullName},</p>
  <p>You (or an administrator) have requested a password reset. Click the link below to set a new password:</p>
  <p><a href="${resetUrl}" style="display: inline-block; background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Reset Password</a></p>
  <p>If you did not request this, please ignore this email.</p>
  <hr style="border: 1px solid #eee; margin: 20px 0;" />
  <p style="font-size: 0.85em; color: #666;">Academic Compass</p>
</body>
</html>
`;

      await transporter.sendMail({
        from: this.from,
        to,
        subject: "Password Reset Request",
        html,
      });

      this.logger.log(`Password reset email sent to ${to}`);
      return true;
    } catch (err) {
      this.logger.error(`Failed to send password reset email to ${params.to}:`, err as Error);
      return false;
    }
  }
}
