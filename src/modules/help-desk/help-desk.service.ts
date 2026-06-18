import { HelpDeskRequest } from '../../models/help-desk-request.model';
import { CreateHelpDeskRequestDto } from './help-desk.interface';
import { EmailService } from '../../services/email.service';
import { env } from '../../config/env';
import { logger } from '../../common/utils/logger';

export class HelpDeskService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  async createRequest(dto: CreateHelpDeskRequestDto): Promise<HelpDeskRequest> {
    const request = await HelpDeskRequest.create({
      name: dto.name,
      email: dto.email,
      message: dto.message,
    });

    // Send notification email to admin (fire-and-forget)
    this.sendAdminNotification(dto).catch((err) => {
      logger.error('Failed to send help-desk admin notification:', err);
    });

    return request;
  }

  private async sendAdminNotification(dto: CreateHelpDeskRequestDto): Promise<void> {
    const adminEmail = env.email.from || 'admin@localloom.com.au';

    await this.emailService.sendRaw({
      to: adminEmail,
      subject: `New Help Desk Request from ${dto.name}`,
      text: `A new help desk request has been submitted.\n\nName: ${dto.name}\nEmail: ${dto.email}\nMessage:\n${dto.message}`,
      html: `
        <h2>New Help Desk Request</h2>
        <p><strong>Name:</strong> ${dto.name}</p>
        <p><strong>Email:</strong> ${dto.email}</p>
        <p><strong>Message:</strong></p>
        <p>${dto.message}</p>
      `,
    });
  }
}
