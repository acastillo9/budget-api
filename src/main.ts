import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import mongoose from 'mongoose';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  if (configService.get('NODE_ENV') === 'development') {
    mongoose.set('debug', true);
  }
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      disableErrorMessages: true,
      whitelist: true,
      transform: true,
    }),
  );
  await app.listen(configService.get('PORT') || 3000);
}
bootstrap();
