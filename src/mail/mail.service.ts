import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import {
  MAIL_EMAIL,
  MAIL_HOST,
  MAIL_PASSWORD,
  MAIL_PORT,
} from './utils/constants';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport(
      {
        host: configService.get(MAIL_HOST),
        port: configService.get(MAIL_PORT),
        secure: true,
        auth: {
          user: configService.get(MAIL_EMAIL),
          pass: configService.get(MAIL_PASSWORD),
        },
      },
      {
        from: {
          name: 'Budget App',
          address: 'info@acastillo.dev',
        },
      },
    );
  }

  async sendMail(email: string, subject: string, html: string) {
    await this.transporter.sendMail({
      to: email,
      subject,
      html,
    });
  }
}
