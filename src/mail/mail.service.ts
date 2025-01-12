import { MailerService } from '@nestjs-modules/mailer';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MailService {
  private readonly logger: Logger = new Logger(MailService.name);

  constructor(private readonly mailService: MailerService) {}

  sendMail(
    to: string,
    subject: string,
    html: string,
    from: string = 'Budget App <ac.budget.app@gmail.com>',
  ) {
    try {
      return this.mailService.sendMail({
        from,
        to,
        subject,
        html,
      });
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);
      throw new Error('Error sending email');
    }
  }
}
