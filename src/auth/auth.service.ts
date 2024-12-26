import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import { RegisterDto } from './dto/register.dto';
import { UserDto } from 'src/shared/dto/user.dto';
import { Session } from './types';
import { UserSession } from 'src/shared/types';
import { EmailRegisteredDto } from './dto/email-registered.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

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

  /**
   * Verify the email of the user.
   * @param verifyEmailDto The data to verify the email.
   * @returns The user verified.
   * @async
   */
  async verifyEmail(verifyEmailDto: VerifyEmailDto): Promise<Session> {
    const user = await this.usersService.verifyEmail(
      verifyEmailDto.email,
      verifyEmailDto.activationCode,
    );

    // generate a jwt token for set password step validation
    const payload = { sub: user.id };
    const accessToken = this.jwtService.sign(payload);

    return {
      access_token: accessToken,
    };
  }

  /**
   * Set the password of the user.
   * @param userId The id of the user to set the password.
   * @param password The password to set.
   * @returns The session created.
   * @async
   */
  async setPassword(userId: string, password: string): Promise<Session> {
    const user = await this.usersService.setPassword(userId, password);

    // generate a jwt token for set password step validation
    const payload = { sub: user.id };
    const accessToken = this.jwtService.sign(payload);

    return {
      access_token: accessToken,
    };
  }

  /**
   * Get the user profile.
   * @param userId The id of the user to get the profile.
   * @returns The user profile.
   * @async
   */
  async me(userId: string): Promise<UserDto> {
    return this.usersService.findById(userId);
  }
}
