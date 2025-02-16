import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import mongoose from 'mongoose';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const isDev = configService.getOrThrow('NODE_ENV') === 'development';
  if (isDev) {
    mongoose.set('debug', true);
  }

  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      disableErrorMessages: !isDev,
      whitelist: true,
    }),
  );
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  await app.listen(configService.getOrThrow('PORT'));
}
bootstrap();
