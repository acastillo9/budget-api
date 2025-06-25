import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JWT_SECRET } from './constants';
import { JwtPayload } from './types';
import { Session } from 'src/core/types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow(JWT_SECRET),
    });
  }

  async validate(payload: JwtPayload): Promise<Session> {
    return {
      authId: payload.sub,
      userId: payload.userId,
      name: payload.name,
      email: payload.email,
      picture: payload.picture,
    };
  }
}
