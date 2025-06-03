import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { I18nService } from 'nestjs-i18n';

@Module({
  imports: [
    MailerModule.forRootAsync({
      useFactory: (configService: ConfigService, i18n: I18nService) => ({
        transport: {
          host: configService.getOrThrow('EMAIL_HOST'),
          port: configService.getOrThrow('EMAIL_PORT'),
          auth: {
            user: configService.getOrThrow('EMAIL_USERNAME'),
            pass: configService.getOrThrow('EMAIL_PASSWORD'),
          },
        },
        defaults: {
          from: configService.getOrThrow('EMAIL_FROM'),
        },
        template: {
          dir: __dirname + '/templates',
          adapter: new HandlebarsAdapter({ t: i18n.hbsHelper }),
          options: {
            strict: true,
          },
        },
      }),
      inject: [ConfigService, I18nService],
    }),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
