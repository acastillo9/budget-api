import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import { RegisterDto } from './dto/register.dto';
import { Session } from './types';
import { EmailRegisteredDto } from './dto/email-registered.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { UserDto } from 'src/users/dto/user.dto';
import { generateActivationCode } from './utils';
import { compare, hash } from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import {
  ACTIVATION_CODE_BYCRYPT_SALT,
  ACTIVATION_CODE_EXPIRATION_TIME,
  ACTIVATION_CODE_RESEND_LIMIT_MAX,
  ACTIVATION_CODE_RESEND_LIMIT_TIME,
  ACTIVATION_CODE_RESEND_LIMIT_TIME_DAILY,
} from './constants';
import { UserStatus } from 'src/users/entities/user-status.enum';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { MailService } from 'src/mail/mail.service';
import { emailVerification } from 'src/mail/templates';
import { RegisterResponseDto } from './dto/register-response.dto';
import { ResendActivationCodeDto } from './dto/resend-activation-code.dto';
import { UpdateUserDto } from 'src/users/dto/update-user.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
  ) {}

  /**
   * Validate a user by email and password.
   * @param email The email of the user.
   * @param password The password of the user.
   * @returns The user if found, null otherwise.
   * @async
   */
  async validateUser(email: string, password: string): Promise<UserDto | null> {
    return this.usersService.findByEmailAndPassword(email, password);
  }

  /**
   * Check if the email is already registered.
   * @param email The email to check.
   * @returns a email registered dto with registered attribute True if the
   * email is registered, false otherwise.
   * @async
   */
  async isEmailRegistered(email: string): Promise<EmailRegisteredDto> {
    const user = await this.usersService.findByEmail(email);
    const registered = user && user.status === UserStatus.ACTIVE;
    return { registered };
  }

  /**
   * Register a new user.
   * @param registerDto The data to register the user.
   * @returns The user registered.
   * @async
   */
  async register(registerDto: RegisterDto): Promise<RegisterResponseDto> {
    const user = await this.usersService.findByEmail(registerDto.email);

    if (user && user.status === UserStatus.ACTIVE) {
      throw new HttpException('User already exists', HttpStatus.CONFLICT);
    }

    const createUserDto: CreateUserDto = {
      name: registerDto.name,
      email: registerDto.email,
    };

    let savedUser: UserDto;
    if (!user) {
      const activationCode =
        await this.addActivationCodeToUserDto(createUserDto);
      savedUser = await this.usersService.create(createUserDto);
      this.sendActivationCodeEmail(savedUser.email, activationCode);
    } else {
      if (user.activationCodeResendAt <= new Date()) {
        const activationCode =
          await this.addActivationCodeToUserDto(createUserDto);
        this.addRetriesToUserDto(createUserDto, user.activationCodeRetries);
        savedUser = await this.usersService.update(user.id, createUserDto);
        this.sendActivationCodeEmail(savedUser.email, activationCode);
      } else {
        savedUser = await this.usersService.update(user.id, createUserDto);
      }
    }

    return {
      id: savedUser.id,
      name: savedUser.name,
      email: savedUser.email,
      activationCodeResendAt: savedUser.activationCodeResendAt,
    };
  }

  /**
   * Resend the activation code to the user.
   * @param email The email of the user to resend the activation code.
   * @returns The response of the resend.
   * @async
   */
  async resendActivationCode(email: string): Promise<ResendActivationCodeDto> {
    const user = await this.usersService.findByEmail(email);

    if (!user || user.status !== UserStatus.UNVERIFIED) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    if (user.activationCodeResendAt > new Date()) {
      throw new HttpException(
        'Resend limit reached',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const userDto: UpdateUserDto = {};
    const activationCode = await this.addActivationCodeToUserDto(userDto);
    this.addRetriesToUserDto(userDto, user.activationCodeRetries);
    const savedUser = await this.usersService.update(user.id, userDto);
    this.sendActivationCodeEmail(user.email, activationCode);

    return {
      activationCodeResendAt: savedUser.activationCodeResendAt,
    };
  }

  /**
   * Verify the email of the user.
   * @param verifyEmailDto The data to verify the email.
   * @returns The user verified.
   * @async
   */
  async verifyEmail(verifyEmailDto: VerifyEmailDto): Promise<Session> {
    const user = await this.usersService.findByEmail(verifyEmailDto.email);

    if (!user || user.status !== UserStatus.UNVERIFIED) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    if (
      !(await compare(verifyEmailDto.activationCode, user.activationCode)) ||
      user.activationCodeExpires < new Date()
    ) {
      throw new HttpException(
        'Invalid activation code',
        HttpStatus.BAD_REQUEST,
      );
    }

    const data = {
      status: UserStatus.VERIFIED_NO_PASSWORD,
      activationCode: null,
      activationCodeExpires: null,
    };
    const savedUser = await this.usersService.update(user.id, data);

    // generate a jwt token for set password step validation
    const payload = { sub: savedUser.id };
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
    const data = {
      password,
      status: UserStatus.ACTIVE,
    };
    const savedUser = await this.usersService.update(userId, data);

    // generate a jwt token for set password step validation
    const payload = { sub: savedUser.id };
    const accessToken = this.jwtService.sign(payload);

    return {
      access_token: accessToken,
    };
  }

  /**
   * Send an email with the activation code.
   * @param to The email to send the activation code.
   * @param activationCode The activation code to send.
   * @async
   */
  private async sendActivationCodeEmail(to: string, activationCode: string) {
    this.mailService.sendMail(
      to,
      'Confirm Your Email',
      emailVerification(activationCode),
    );
  }

  /**
   * Add the activation code to the user dto.
   * @param createUserDto The user dto to add the activation code.
   * @returns The activation code.
   * @async
   */
  private async addActivationCodeToUserDto(createUserDto: UpdateUserDto) {
    const activationCode = generateActivationCode();
    const hashedActivationCode = await hash(
      activationCode,
      Number(this.configService.get(ACTIVATION_CODE_BYCRYPT_SALT)),
    );
    createUserDto.activationCode = hashedActivationCode;
    createUserDto.activationCodeExpires = new Date(
      Date.now() + ACTIVATION_CODE_EXPIRATION_TIME,
    );
    createUserDto.activationCodeResendAt = new Date(
      Date.now() + ACTIVATION_CODE_RESEND_LIMIT_TIME,
    );
    return activationCode;
  }

  /**
   * Add the retries to the user dto.
   * @param createUserDto The user dto to add the retries.
   * @param retries The current retries.
   * @async
   */
  private async addRetriesToUserDto(
    createUserDto: UpdateUserDto,
    retries: number,
  ) {
    createUserDto.activationCodeRetries = retries + 1;
    if (
      createUserDto.activationCodeRetries === ACTIVATION_CODE_RESEND_LIMIT_MAX
    ) {
      createUserDto.activationCodeResendAt = new Date(
        Date.now() + ACTIVATION_CODE_RESEND_LIMIT_TIME_DAILY,
      );
      createUserDto.activationCodeRetries = 0;
    }
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

  /**
   * Login a user.
   * @param userId The id of the user to login.
   * @returns The access token.
   * @async
   */
  async login(userId: string): Promise<Session> {
    const payload = { sub: userId };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
