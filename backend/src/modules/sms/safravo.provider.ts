import { Injectable, OnModuleInit } from "@nestjs/common";
import { SmsProvider } from "./sms.provider";

interface SafravoResponse {
  status: string;
  messageId?: string;
  error?: string;
}

@Injectable()
export class SafravoSmsProvider implements SmsProvider, OnModuleInit {
  private baseUrl: string;
  private apiKey: string;
  private senderId: string;

  constructor() {
    this.baseUrl = process.env.SMS_PROVIDER_URL || "https://api.safravo.com/v1";
    this.apiKey = process.env.SMS_API_KEY || "";
    this.senderId = process.env.SMS_SENDER_ID || "ACCompass";
  }

  onModuleInit() {
    if (!this.apiKey) {
      console.warn("[SafravoSmsProvider] SMS_API_KEY is not configured");
    }
  }

  async sendSms(params: {
    to: string;
    message: string;
    senderId?: string;
  }): Promise<{ success: boolean; providerId?: string; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/sms/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          to: params.to,
          message: params.message,
          sender_id: params.senderId || this.senderId,
        }),
      });

      const data = await response.json() as SafravoResponse;

      if (response.ok && data.status === "success") {
        return {
          success: true,
          providerId: data.messageId,
        };
      }

      return {
        success: false,
        error: data.error || `HTTP ${response.status}: ${response.statusText}`,
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
