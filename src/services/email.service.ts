import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../common/utils/logger';

/**
 * Email Service — wraps Nodemailer SMTP for OTP delivery.
 *
 * - If EMAIL_HOST / EMAIL_USER / EMAIL_PASS are configured: uses real SMTP transport
 * - Otherwise (dev mode): logs OTP to console and returns true
 */
export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private from: string;

  constructor() {
    this.from = env.email.from || 'noreply@localloom.com.au';
    this.initTransporter();
  }

  private initTransporter(): void {
    const { host, user, pass } = env.email;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: env.email.port,
        secure: env.email.port === 465,
        auth: { user, pass },
      });
      logger.info('Email transporter initialized for SMTP delivery');
    } else {
      logger.info('Email transporter NOT initialized — using dev mode (OTP logged to console)');
    }
  }

  /**
   * Send an OTP code to an email address.
   * @param email - Recipient email address
   * @param code  - The OTP code to send
   */
  async sendOtp(email: string, code: string): Promise<boolean> {
    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: this.from,
          to: email,
          subject: 'Your LocalLoom verification code',
          text: `Your verification code is: ${code}\n\nThis code expires in 5 minutes. Do not share it with anyone.`,
          html: `
            <p>Your LocalLoom verification code is:</p>
            <h2 style="letter-spacing:4px">${code}</h2>
            <p>This code <strong>expires in 5 minutes</strong>. Do not share it with anyone.</p>
          `,
        });

        logger.info(`OTP email sent to ${email}`);
        return true;
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown email provider error';
        logger.error(`Failed to send OTP email to ${email}: ${msg}`);
        throw new Error(`Failed to send OTP email: ${msg}`);
      }
    }

    // Dev mode — log and return true
    logger.info(`[DEV] OTP for ${email}: ${code}`);
    return true;
  }

  /**
   * Send a raw email with custom subject, text, and html.
   */
  async sendRaw(options: { to: string; subject: string; text: string; html: string }): Promise<boolean> {
    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: this.from,
          to: options.to,
          subject: options.subject,
          text: options.text,
          html: options.html,
        });
        logger.info(`Email sent to ${options.to}: ${options.subject}`);
        return true;
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown email provider error';
        logger.error(`Failed to send email to ${options.to}: ${msg}`);
        throw new Error(`Failed to send email: ${msg}`);
      }
    }

    // Dev mode — log and return true
    logger.info(`[DEV] Email to ${options.to}: ${options.subject}`);
    return true;
  }
}
