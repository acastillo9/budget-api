import { ISendMailOptions, MailerService } from '@nestjs-modules/mailer';
import { Injectable, Logger } from '@nestjs/common';
import { I18nContext } from 'nestjs-i18n';

@Injectable()
export class MailService {
  private readonly logger: Logger = new Logger(MailService.name);

  constructor(private readonly mailerService: MailerService) {}

  async sendMail(sendMailOptions: ISendMailOptions) {
    try {
      // hbsHelper needs to know the current language
      sendMailOptions.context = {
        ...(sendMailOptions.context || {}),
        i18nLang: I18nContext.current().lang || 'en',
      };
      return await this.mailerService.sendMail(sendMailOptions);
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);
      throw new Error('Error sending email');
    }
  }
}
