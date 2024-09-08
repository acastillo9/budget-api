import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import mongoose from 'mongoose';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  if (configService.get('NODE_ENV') === 'development') {
    mongoose.set('debug', true);
  }
  app.enableCors();
  await app.listen(configService.getOrThrow('PORT'));
}
bootstrap();
