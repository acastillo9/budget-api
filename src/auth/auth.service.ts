import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import { RegisterDto } from './dto/register.dto';
import { UserDto } from 'src/shared/dto/user.dto';
import { Session } from './types';
import { UserSession } from 'src/shared/types';
import { EmailRegisteredDto } from './dto/email-registered.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  /**
   * Validate a user by email and password.
   * @param email The email of the user.
   * @param password The password of the user.
   * @returns The user if found, null otherwise.
   * @async
   */
  async validateUser(email: string, password: string): Promise<UserDto | null> {
    return this.usersService.findUserByEmailAndPassword(email, password);
  }

  /**
   * Login a user.
   * @param user The user to login.
   * @returns The access token.
   * @async
   */
  async login(user: UserSession): Promise<Session> {
    const payload = { sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  /**
   * Register a new user.
   * @param registerDto The data to register the user.
   * @returns The user registered.
   * @async
   */
  async register(registerDto: RegisterDto): Promise<UserDto> {
    return this.usersService.create(registerDto);
  }

  /**
   * Check if the email is already registered.
   * @param email The email to check.
   * @returns a email registered dto with registered attribute True if the
   * email is registered, false otherwise.
   * @async
   */
  async emailRegistered(email: string): Promise<EmailRegisteredDto> {
    return {
      registered: await this.usersService.userExists(email),
    };
  }
}
