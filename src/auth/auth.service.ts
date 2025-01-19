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
  PASSWORD_BYCRYPT_SALT,
  PASSWORD_RESET_JWT_EXPIRATION_TIME,
  PASSWORD_RESET_LIMIT_MAX,
  PASSWORD_RESET_URL,
  REMEMBER_ME_TOKEN_EXPIRATION_TIME,
} from './constants';
import { UserStatus } from 'src/users/entities/user-status.enum';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { MailService } from 'src/mail/mail.service';
import { emailVerification, passwordReset } from 'src/mail/templates';
import { RegisterResponseDto } from './dto/register-response.dto';
import { ResendActivationCodeDto } from './dto/resend-activation-code.dto';
import { UpdateUserDto } from 'src/users/dto/update-user.dto';
import { UserSessionDto } from './dto/user-session.dto';
import { ActivationDataDto } from 'src/users/dto/activation-data.dto';

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
    const passwordStored = await this.usersService.findPasswordByEmail(email);
    if (!passwordStored) return null;
    const isPasswordMatching = await compare(password, passwordStored);
    if (!isPasswordMatching) return null;
    return this.usersService.findByEmail(email);
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
    const registered = !!user && user.status === UserStatus.ACTIVE;
    return { registered };
  }

  /**
   * Register a new user.
   * @param registerDto The data to register the user.
   * @returns The user registered.
   * @async
   */
  async register(registerDto: RegisterDto): Promise<RegisterResponseDto> {
    const activationData = await this.usersService.findActivationDataByEmail(
      registerDto.email,
    );

    if (activationData && activationData.status === UserStatus.ACTIVE) {
      throw new HttpException('User already exists', HttpStatus.CONFLICT);
    }

    const createUserDto: CreateUserDto = {
      name: registerDto.name,
      email: registerDto.email,
    };

    let savedUser: UserDto;
    let activationCodeResendAt = activationData?.activationCodeResendAt;
    if (!activationData) {
      const activationCodeData = await this.calculateActivationCodeData(-1);
      savedUser = await this.usersService.create({
        ...createUserDto,
        activationCode: activationCodeData.hashedActivationCode,
        activationCodeExpires: activationCodeData.activationCodeExpires,
        activationCodeResendAt: activationCodeData.activationCodeResendAt,
        activationCodeRetries: activationCodeData.activationCodeRetries,
      });
      activationCodeResendAt = activationCodeData.activationCodeResendAt;
      this.sendActivationCodeEmail(
        savedUser.email,
        activationCodeData.activationCode,
      );
    } else {
      if (activationData.activationCodeResendAt <= new Date()) {
        const activationCodeData = await this.calculateActivationCodeData(
          activationData.activationCodeRetries,
        );
        savedUser = await this.usersService.update(activationData.id, {
          ...createUserDto,
          activationCode: activationCodeData.hashedActivationCode,
          activationCodeExpires: activationCodeData.activationCodeExpires,
          activationCodeResendAt: activationCodeData.activationCodeResendAt,
          activationCodeRetries: activationCodeData.activationCodeRetries,
        });
        activationCodeResendAt = activationCodeData.activationCodeResendAt;
        this.sendActivationCodeEmail(
          savedUser.email,
          activationCodeData.activationCode,
        );
      } else {
        savedUser = await this.usersService.update(
          activationData.id,
          createUserDto,
        );
      }
    }

    return {
      id: savedUser.id,
      name: savedUser.name,
      email: savedUser.email,
      activationCodeResendAt,
    };
  }

  /**
   * Resend the activation code to the user.
   * @param email The email of the user to resend the activation code.
   * @returns The response of the resend.
   * @async
   */
  async resendActivationCode(email: string): Promise<ResendActivationCodeDto> {
    const activationData =
      await this.usersService.findActivationDataByEmail(email);

    if (!activationData || activationData.status !== UserStatus.UNVERIFIED) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    if (activationData.activationCodeResendAt > new Date()) {
      throw new HttpException(
        'Resend limit reached',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const activationCodeData = await this.calculateActivationCodeData(
      activationData.activationCodeRetries,
    );
    await this.usersService.update(activationData.id, {
      activationCode: activationCodeData.hashedActivationCode,
      activationCodeExpires: activationCodeData.activationCodeExpires,
      activationCodeResendAt: activationCodeData.activationCodeResendAt,
      activationCodeRetries: activationCodeData.activationCodeRetries,
    });
    this.sendActivationCodeEmail(email, activationCodeData.activationCode);

    return {
      activationCodeResendAt: activationCodeData.activationCodeResendAt,
    };
  }

  /**
   * Verify the email of the user.
   * @param verifyEmailDto The data to verify the email.
   * @returns The user verified.
   * @async
   */
  async verifyEmail(verifyEmailDto: VerifyEmailDto): Promise<Session> {
    const activationData = await this.usersService.findActivationDataByEmail(
      verifyEmailDto.email,
    );

    if (!activationData || activationData.status !== UserStatus.UNVERIFIED) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    if (
      !(await compare(
        verifyEmailDto.activationCode,
        activationData.activationCode,
      )) ||
      activationData.activationCodeExpires < new Date()
    ) {
      throw new HttpException(
        'Invalid activation code',
        HttpStatus.BAD_REQUEST,
      );
    }

    const data: UpdateUserDto = {
      status: UserStatus.VERIFIED_NO_PASSWORD,
      activationCode: null,
      activationCodeExpires: null,
      activationCodeResendAt: null,
      activationCodeRetries: 0,
    };
    await this.usersService.update(activationData.id, data);

    // generate a jwt token for set password step validation
    const payload = { sub: activationData.id };
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
    const hashedPassword = await hash(
      password,
      Number(this.configService.get(PASSWORD_BYCRYPT_SALT)),
    );
    const data = {
      password: hashedPassword,
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
   * Get the user profile.
   * @param userId The id of the user to get the profile.
   * @returns The user profile.
   * @async
   */
  async me(userId: string): Promise<UserSessionDto> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    return {
      id: user.id,
      name: user.name,
    };
  }

  /**
   * Login a user.
   * @param userId The id of the user to login.
   * @param rememberMe If the login is remembered
   * @returns The access token.
   * @async
   */
  async login(userId: string, rememberMe: boolean): Promise<Session> {
    const payload = { sub: userId };
    let accessToken = this.jwtService.sign(payload);

    if (rememberMe) {
      accessToken = this.jwtService.sign(payload, {
        expiresIn: REMEMBER_ME_TOKEN_EXPIRATION_TIME,
      });
    }

    return {
      access_token: accessToken,
    };
  }

  /**
   * Send an email with a link to reset the password.
   * @param email The email of the user to reset the password.
   * @async
   */
  async forgotPassword(email: string): Promise<void> {
    const resetPasswordData =
      await this.usersService.findResetPasswordDataByEmail(email);

    if (!resetPasswordData || resetPasswordData.status !== UserStatus.ACTIVE) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    if (
      resetPasswordData.resetPasswordLastSentAt &&
      resetPasswordData.resetPasswordLastSentAt > new Date()
    ) {
      throw new HttpException(
        'Reset password limit reached',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const userDto: UpdateUserDto = {};
    userDto.resetPasswordRetries = resetPasswordData.resetPasswordRetries + 1;

    if (userDto.resetPasswordRetries === PASSWORD_RESET_LIMIT_MAX) {
      // can send again tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      userDto.resetPasswordLastSentAt = tomorrow;
      userDto.resetPasswordRetries = 0;
    }

    await this.usersService.update(resetPasswordData.id, userDto);

    // generate a jwt token for set password step validation
    const payload = { sub: resetPasswordData.id };
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get(PASSWORD_RESET_JWT_EXPIRATION_TIME),
    });
    const resetLink = `${this.configService.get(PASSWORD_RESET_URL)}?token=${accessToken}`;
    this.mailService.sendMail(
      email,
      'Reset Your Password',
      passwordReset(resetLink),
    );
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
   * Get the activation code data calculated based on current date
   * @param updateUserDto The user dto to add the activation code.
   * @returns The activation code.
   * @async
   */
  private async calculateActivationCodeData(
    retries: number,
  ): Promise<Partial<ActivationDataDto>> {
    const activationCode = generateActivationCode();
    const hashedActivationCode = await hash(
      activationCode,
      Number(this.configService.get(ACTIVATION_CODE_BYCRYPT_SALT)),
    );
    const activationCodeData = {
      activationCode,
      hashedActivationCode,
      activationCodeExpires: new Date(
        Date.now() + ACTIVATION_CODE_EXPIRATION_TIME,
      ),
      activationCodeResendAt: new Date(
        Date.now() + ACTIVATION_CODE_RESEND_LIMIT_TIME,
      ),
      activationCodeRetries: retries + 1,
    };

    if (
      activationCodeData.activationCodeRetries ===
      ACTIVATION_CODE_RESEND_LIMIT_MAX
    ) {
      activationCodeData.activationCodeResendAt = new Date(
        Date.now() + ACTIVATION_CODE_RESEND_LIMIT_TIME_DAILY,
      );
      activationCodeData.activationCodeRetries = 0;
    }

    return activationCodeData;
  }
}
