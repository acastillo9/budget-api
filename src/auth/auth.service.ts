import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import { compare, hash } from 'bcrypt';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { JWT_HASH_CYCLES } from './utils/constants';

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
    const user =
      await this.usersService.findOneByUsernameWithPassword(username);
    const isPasswordMatching = await compare(pass, user.password);
    if (!isPasswordMatching) {
      throw new UnauthorizedException();
    }
    const payload = { sub: user.id };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }

  async signUp(createUserDto: CreateUserDto) {
    const newUser = {
      ...createUserDto,
      password: await hash(createUserDto.password, JWT_HASH_CYCLES),
    };
    return this.usersService.create(newUser);
  }

  async getProfile(userId: string) {
    return this.usersService.findOne(userId);
  }
}
