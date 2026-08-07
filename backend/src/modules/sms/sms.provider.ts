export interface SmsProvider {
  sendSms(params: {
    to: string;
    message: string;
    senderId?: string;
  }): Promise<{ success: boolean; providerId?: string; error?: string }>;
}
