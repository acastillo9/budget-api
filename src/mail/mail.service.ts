import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MailService {
  constructor(private readonly mailService: MailerService) {}

  sendMail(
    to: string,
    subject: string,
    html: string,
    from: string = 'Budget App <ac.budget.app@gmail.com>',
  ) {
    this.mailService.sendMail({
      from,
      to,
      subject,
      html,
    });
  }
}
