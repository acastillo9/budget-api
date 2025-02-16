import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import { RegisterDto } from './dto/register.dto';
import { GoogleAuthenticatedRequest, Session } from './types';
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
import { InjectModel } from '@nestjs/mongoose';
import {
  Authentication,
  AuthenticationDocument,
} from './entities/authentication.entity';
import { Model } from 'mongoose';
import { AuthenticationProviderType } from './entities/authentication-provider-type.enum';
import { AuthenticationDto } from './dto/authentication.dto';
import { plainToClass } from 'class-transformer';
import { CreateAuthenticationDto } from './dto/create-authentication.dto';
import { DbTransactionService } from 'src/core/db-transaction.service';

@Injectable()
export class AuthService {
  private readonly logger: Logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
    @InjectModel(Authentication.name)
    private readonly authenticationModel: Model<Authentication>,
    private dbTransactionService: DbTransactionService,
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
    const emailAuthentication = await this.findAuthenticationProvider(
      AuthenticationProviderType.EMAIL,
      email,
    );
    const registered =
      emailAuthentication &&
      emailAuthentication.user.status === UserStatus.ACTIVE;
    return { registered };
  }

  /**
   * Register a new user.
   * @param registerDto The data to register the user.
   * @returns The user registered.
   * @async
   */
  async register(registerDto: RegisterDto): Promise<RegisterResponseDto> {
    const emailAuthentication = await this.findAuthenticationProvider(
      AuthenticationProviderType.EMAIL,
      registerDto.email,
    );

    // if user is already active, return conflict
    if (
      emailAuthentication &&
      emailAuthentication.user.status === UserStatus.ACTIVE
    ) {
      throw new HttpException('User already exists', HttpStatus.CONFLICT);
    }

    // if the email authentication is not found crete a new user and email authentication
    if (!emailAuthentication) {
      let activationData: ActivationDataDto;
      const savedUser = await this.usersService.findByEmail(registerDto.email);
      // if the user is not found, create a new user and email authentication
      if (!savedUser) {
        activationData =
          await this.createNewUserAndEmailAuthentication(registerDto);
      } else {
        // create only the email authentication
        activationData = await this.createNewEmailAuthentication(savedUser.id);
      }

      this.sendActivationCodeEmail(
        activationData.email,
        activationData.activationCode,
      );

      return {
        id: activationData.id,
        name: activationData.name,
        email: activationData.email,
        activationCodeResendAt: activationData.activationCodeResendAt,
      };
    }

    // if the email authentication is found, resend the activation code if the resend limit is reached
    const user = emailAuthentication.user;
    if (user.activationCodeResendAt <= new Date()) {
      const activationData = await this.calculateActivationCodeData(
        user.activationCodeRetries,
      );
      const updatedUser = await this.usersService.update(user.id, {
        name: registerDto.name,
        activationCode: activationData.hashedActivationCode,
        activationCodeExpires: activationData.activationCodeExpires,
        activationCodeResendAt: activationData.activationCodeResendAt,
        activationCodeRetries: activationData.activationCodeRetries,
        status: UserStatus.UNVERIFIED,
      });

      this.sendActivationCodeEmail(
        updatedUser.email,
        activationData.activationCode,
      );

      return {
        id: activationData.id,
        name: activationData.name,
        email: activationData.email,
        activationCodeResendAt: activationData.activationCodeResendAt,
      };
    }

    // simply update the user name
    const savedUser = await this.usersService.update(user.id, {
      name: registerDto.name,
      status: UserStatus.UNVERIFIED,
    });

    return {
      id: savedUser.id,
      name: savedUser.name,
      email: savedUser.email,
      activationCodeResendAt: user.activationCodeResendAt,
    };
  }

  /**
   * Resend the activation code to the user.
   * @param email The email of the user to resend the activation code.
   * @returns The response of the resend.
   * @async
   */
  async resendActivationCode(email: string): Promise<ResendActivationCodeDto> {
    const emailAuthenticationProvider = await this.findAuthenticationProvider(
      AuthenticationProviderType.EMAIL,
      email,
    );

    const user = emailAuthenticationProvider?.user;
    if (!user || user.status !== UserStatus.UNVERIFIED) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    if (user.activationCodeResendAt > new Date()) {
      throw new HttpException(
        'Resend limit reached',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const activationCodeData = await this.calculateActivationCodeData(
      user.activationCodeRetries,
    );
    await this.usersService.update(user.id, {
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
    const emailAuthenticationProvider = await this.findAuthenticationProvider(
      AuthenticationProviderType.EMAIL,
      verifyEmailDto.email,
    );

    const user = emailAuthenticationProvider?.user;
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

    const data: UpdateUserDto = {
      status: UserStatus.VERIFIED_NO_PASSWORD,
    };
    await this.usersService.update(user.id, data);

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
    const hashedPassword = await hash(
      password,
      Number(this.configService.getOrThrow(PASSWORD_BYCRYPT_SALT)),
    );
    const data = {
      password: hashedPassword,
      status: UserStatus.ACTIVE,
      activationCode: null,
      activationCodeExpires: null,
      activationCodeResendAt: null,
      activationCodeRetries: 0,
      resetPasswordRetries: 0,
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
  async login(userId: string, rememberMe: boolean = false): Promise<Session> {
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
      expiresIn: this.configService.getOrThrow(
        PASSWORD_RESET_JWT_EXPIRATION_TIME,
      ),
    });
    const resetLink = `${this.configService.getOrThrow(PASSWORD_RESET_URL)}?token=${accessToken}`;
    this.mailService.sendMail(
      email,
      'Reset Your Password',
      passwordReset(resetLink),
    );
  }

  /**
   * Login a user with google.
   * @param req The request object.
   * @returns The session created.
   * @async
   */
  async googleLogin(req: GoogleAuthenticatedRequest) {
    if (!req.user) {
      throw new HttpException('Login fail', HttpStatus.BAD_REQUEST);
    }

    const googleAuthentication = await this.findAuthenticationProvider(
      AuthenticationProviderType.GOOGLE,
      req.user.sub,
    );

    if (!googleAuthentication) {
      let user = await this.usersService.findByEmail(req.user.email);
      try {
        let savedAuthentication: AuthenticationDocument;
        if (!user) {
          // create the user and the google authentication
          savedAuthentication = await this.dbTransactionService.runTransaction(
            async (session) => {
              const createUserDto: CreateUserDto = {
                name: req.user.displayName,
                email: req.user.email,
                picture: req.user.picture,
                status: UserStatus.ACTIVE,
              };
              user = await this.usersService.create(createUserDto, session);

              const createAuthenticationDto: CreateAuthenticationDto = {
                providerType: AuthenticationProviderType.GOOGLE,
                providerUserId: req.user.sub,
                user: user.id,
              };
              const newAuthentication = new this.authenticationModel(
                createAuthenticationDto,
              );
              return newAuthentication.save({ session });
            },
          );
        } else {
          // link the google authentication to the user
          const createAuthenticationDto: CreateAuthenticationDto = {
            providerType: AuthenticationProviderType.GOOGLE,
            providerUserId: req.user.sub,
            user: user.id,
          };
          const newAuthentication = new this.authenticationModel(
            createAuthenticationDto,
          );
          savedAuthentication = await newAuthentication.save();
        }

        return this.login(savedAuthentication.user.id);
      } catch (error) {
        this.logger.error(
          `Failed to create authentication: ${error.message}`,
          error.stack,
        );
        throw new HttpException(
          'Error creating the authentication',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }

    return this.login(googleAuthentication.user.id);
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
  ): Promise<ActivationDataDto> {
    const activationCode = generateActivationCode();
    const hashedActivationCode = await hash(
      activationCode,
      Number(this.configService.getOrThrow(ACTIVATION_CODE_BYCRYPT_SALT)),
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

  /**
   * Find an authentication provider by provider type and provider user id.
   * @param providerType The provider type to find.
   * @param providerUserId The provider user id to find.
   * @returns The authentication provider found.
   * @async
   */
  private async findAuthenticationProvider(
    providerType: AuthenticationProviderType,
    providerUserId: string,
  ): Promise<AuthenticationDto | null> {
    try {
      const authentication = await this.authenticationModel.findOne({
        providerType,
        providerUserId,
      });
      if (!authentication) return null;
      return plainToClass(AuthenticationDto, authentication.toObject());
    } catch (error) {
      this.logger.error(
        `Failed to find authentication provider: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error finding the authentication provider',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Create a new user and email authentication.
   * @param registerDto The data to create the user.
   * @returns The activation data.
   * @async
   */
  private async createNewUserAndEmailAuthentication(
    registerDto: RegisterDto,
  ): Promise<ActivationDataDto> {
    const activationCodeData = await this.calculateActivationCodeData(-1);
    try {
      return this.dbTransactionService.runTransaction(async (session) => {
        const createUserDto: CreateUserDto = {
          name: registerDto.name,
          email: registerDto.email,
          activationCode: activationCodeData.hashedActivationCode,
          activationCodeExpires: activationCodeData.activationCodeExpires,
          activationCodeResendAt: activationCodeData.activationCodeResendAt,
          activationCodeRetries: activationCodeData.activationCodeRetries,
        };
        const newUser = await this.usersService.create(createUserDto, session);
        const createAuthenticationDto: CreateAuthenticationDto = {
          providerType: AuthenticationProviderType.EMAIL,
          providerUserId: newUser.email,
          user: newUser.id,
        };
        const newAuthentication = new this.authenticationModel(
          createAuthenticationDto,
        );
        await newAuthentication.save({ session });
        return {
          ...activationCodeData,
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
        };
      });
    } catch (error) {
      this.logger.error(`Failed to create user: ${error.message}`, error.stack);
      throw new HttpException(
        'Error creating the user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Create a new email authentication.
   * @param userId The id of the user to create the email authentication.
   * @returns The activation data.
   * @async
   */
  private async createNewEmailAuthentication(
    userId: string,
  ): Promise<ActivationDataDto> {
    try {
      return this.dbTransactionService.runTransaction(async (session) => {
        const activationCodeData = await this.calculateActivationCodeData(-1);
        const updatedUser = await this.usersService.update(
          userId,
          {
            activationCode: activationCodeData.hashedActivationCode,
            activationCodeExpires: activationCodeData.activationCodeExpires,
            activationCodeResendAt: activationCodeData.activationCodeResendAt,
            activationCodeRetries: activationCodeData.activationCodeRetries,
            status: UserStatus.UNVERIFIED,
          },
          session,
        );
        const createAuthenticationDto: CreateAuthenticationDto = {
          providerType: AuthenticationProviderType.EMAIL,
          providerUserId: updatedUser.email,
          user: updatedUser.id,
        };
        const newAuthentication = new this.authenticationModel(
          createAuthenticationDto,
        );
        await newAuthentication.save({ session });
        return {
          ...activationCodeData,
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
        };
      });
    } catch (error) {
      this.logger.error(
        `Failed to create authentication: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error creating the authentication',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
