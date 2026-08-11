import { Injectable, OnModuleInit } from "@nestjs/common";
import { SmsProvider } from "./sms.provider";

interface SafravoResponse {
  status: string;
  messageId?: string;
  message_id?: string;
  error?: string;
}

// Local shim so we don't conflict with Express's Response type
interface FetchResponse {
  ok: boolean;
  status: number;
  statusText: string;
  json(): Promise<unknown>;
}

@Injectable()
export class SafravoSmsProvider implements SmsProvider, OnModuleInit {
  private baseUrl: string;
  private apiKey: string;
  private partnerId: string;
  private senderId: string;

  constructor() {
    this.baseUrl = (process.env.SMS_PROVIDER_URL || "https://api.safravo.co.ke").replace(/\/$/, "");
    this.apiKey = process.env.SMS_API_KEY || "";
    this.partnerId = process.env.SMS_PARTNER_ID || "";
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
      const response = await (fetch as (url: string, init?: object) => Promise<FetchResponse>)(
        `${this.baseUrl}/sms/v1/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            apikey: this.apiKey,
            partnerID: this.partnerId,
            mobile: params.to,
            message: params.message,
            shortcode: params.senderId || this.senderId,
          }),
        }
      );

      const data = await response.json() as SafravoResponse;

      if (response.ok && data.status === "success") {
        return {
          success: true,
          providerId: data.messageId || data.message_id,
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
