import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from 'src/users/users.module';
import { APP_GUARD } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { LocalStrategy } from './local.strategy';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { MailModule } from 'src/mail/mail.module';
import { GoogleStrategy } from './google.strategy';
import { MongooseModule } from '@nestjs/mongoose';
import {
  AuthenticationProvider,
  AuthenticationProviderSchema,
} from './entities/authentication-provider.entity';
import { SharedModule } from 'src/shared/shared.module';
import { JwtRefreshStrategy } from './jwt-refresh.strategy';

@Module({
  imports: [
    SharedModule,
    UsersModule,
    PassportModule,
    JwtModule.register({}),
    MailModule,
    MongooseModule.forFeature([
      {
        name: AuthenticationProvider.name,
        schema: AuthenticationProviderSchema,
      },
    ]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    LocalStrategy,
    JwtStrategy,
    JwtRefreshStrategy,
    GoogleStrategy,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AuthModule {}
