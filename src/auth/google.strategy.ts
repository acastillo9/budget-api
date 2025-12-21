import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GOOGLE_CALLBACK_URL,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
} from './constants';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private configService: ConfigService) {
    super({
      clientID: configService.getOrThrow(GOOGLE_CLIENT_ID),
      clientSecret: configService.getOrThrow(GOOGLE_CLIENT_SECRET),
      callbackURL: configService.getOrThrow(GOOGLE_CALLBACK_URL),
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, displayName, emails, photos, locale } = profile;
    const user = {
      sub: id,
      email: emails[0].value,
      displayName,
      picture: photos[0].value,
      accessToken,
      refreshToken,
      locale,
    };
    done(null, user);
  }
}
