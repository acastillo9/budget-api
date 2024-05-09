import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import { compare } from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async signIn(
    username: string,
    pass: string,
  ): Promise<{ access_token: string }> {
    const user = await this.usersService.findOne(username);
    const isPasswordMatching = await compare(pass, user.password);
    if (!isPasswordMatching) {
      throw new UnauthorizedException();
    }
    const payload = { sub: user.id, name: user.name, username: user.email };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}
