import { env } from '../config/env';
import { logger } from '../common/utils/logger';

/**
 * SMS Service — wraps Twilio Verify API for OTP delivery.
 *
 * - If Twilio credentials are configured: uses real Twilio Verify API
 * - If no credentials (dev mode): logs OTP to console, accepts dev code
 */
export class SmsService {
  private client: unknown = null;
  private initialized = false;

  constructor() {
    this.initClient();
  }

  private initClient(): void {
    const sid = env.twilio.accountSid;
    const token = env.twilio.authToken;
    const messagingSid = env.twilio.messagingServiceSid;

    // Only initialize Twilio if all credentials are present and SID starts with 'AC'
    if (sid && token && messagingSid && sid.startsWith('AC')) {
      try {
        // Dynamic require to avoid crash when credentials are empty
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const Twilio = require('twilio');
        this.client = Twilio(sid, token);
        this.initialized = true;
        logger.info('Twilio client initialized for SMS delivery');
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        logger.warn(`Failed to initialize Twilio client: ${msg}`);
        this.client = null;
      }
    } else {
      logger.info('Twilio client NOT initialized — using dev mode OTP (code: %s)', env.otp.devCode);
    }
  }

  /**
   * Send OTP to a phone number.
   * @param phone - E.164 format phone number (e.g., +61412345678)
   * @param code  - The OTP code to send (same code stored in DB)
   */
  async sendOtp(phone: string, code: string): Promise<boolean> {
    if (this.initialized && this.client) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const twilioClient = this.client as any;
        // Use Twilio Messaging API so we control the exact code (same as stored in DB)
        await twilioClient.messages.create({
          to: phone,
          messagingServiceSid: env.twilio.messagingServiceSid,
          body: `Your LocalLoom verification code is: ${code}\n\nThis code expires in ${env.otp.expiryMinutes} minutes. Do not share it with anyone.`,
        });

        logger.info(`OTP SMS sent to ${phone}`);
        return true;
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown Twilio error';
        logger.error(`Failed to send OTP to ${phone}: ${msg}`);
        throw new Error(`Failed to send OTP: ${msg}`);
      }
    }

    // Dev mode — log the same code that was stored in DB
    logger.info(`[DEV] OTP for ${phone}: ${code}`);
    return true;
  }

}
