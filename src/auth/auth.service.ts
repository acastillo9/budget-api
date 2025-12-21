import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import { RegisterDto } from './dto/register.dto';
import { Credentials } from './types';
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
  JWT_EXPIRATION_TIME,
  JWT_REFRESH_EXPIRATION_TIME,
  JWT_REFRESH_LONG_LIVED_EXPIRATION_TIME,
  JWT_REFRESH_SECRET,
  JWT_SECRET,
  JWT_SET_PASSWORD_EXPIRATION_TIME,
  JWT_SET_PASSWORD_SECRET,
  PASSWORD_BYCRYPT_SALT,
  PASSWORD_RESET_LIMIT_MAX,
  PASSWORD_RESET_TOKEN_BYCRYPT_SALT,
  PASSWORD_RESET_URL,
} from './constants';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { MailService } from 'src/mail/mail.service';
import { RegisterResponseDto } from './dto/register-response.dto';
import { ResendActivationCodeDto } from './dto/resend-activation-code.dto';
import { ActivationDataDto } from './dto/activation-data.dto';
import { InjectModel } from '@nestjs/mongoose';
import { AuthenticationProvider } from './entities/authentication-provider.entity';
import { ClientSession, Model } from 'mongoose';
import { AuthenticationProviderType } from './entities/authentication-provider-type.enum';
import { AuthenticationProviderDto } from './dto/authentication-provider.dto';
import { plainToClass } from 'class-transformer';
import { CreateAuthenticationProviderDto } from './dto/create-authentication-provider.dto';
import { DbTransactionService } from 'src/shared/db-transaction.service';
import { AuthenticationProviderStatus } from './entities/authentication-provider-status.enum';
import { UpdateAuthenticationProviderDto } from './dto/update-authentication-provider.dto';
import { I18nService } from 'nestjs-i18n';
import { CurrencyCode } from 'src/shared/entities/currency-code.enum';
import { GoogleLoginDto } from './dto/google-login.dto';

@Injectable()
export class AuthService {
  private readonly logger: Logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
    @InjectModel(AuthenticationProvider.name)
    private readonly authenticationProviderModel: Model<AuthenticationProvider>,
    private dbTransactionService: DbTransactionService,
    private readonly i18n: I18nService,
  ) {}

  /**
   * Validate a user by email and password.
   * @param email The email of the user.
   * @param password The password of the user.
   * @returns The user if found, null otherwise.
   * @async
   */
  async findUserByEmailAndPassword(
    email: string,
    password: string,
  ): Promise<UserDto | null> {
    const emailAuthenticationProvider = await this.findAuthenticationProvider(
      AuthenticationProviderType.EMAIL,
      email,
    );
    if (
      !emailAuthenticationProvider ||
      emailAuthenticationProvider.status !== AuthenticationProviderStatus.ACTIVE
    ) {
      return null;
    }
    const isPasswordMatching = await compare(
      password,
      emailAuthenticationProvider.password,
    );
    if (!isPasswordMatching) return null;
    return emailAuthenticationProvider.user;
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
      !!emailAuthentication &&
      emailAuthentication.status === AuthenticationProviderStatus.ACTIVE;
    return { registered };
  }

  /**
   * Register a new user by email.
   * @param registerDto The data to register the user.
   * @param locale The locale of the user to register.
   * @returns The user registered.
   * @async
   */
  async registerByEmail(
    registerDto: RegisterDto,
    locale: string,
  ): Promise<RegisterResponseDto> {
    const user = await this.usersService.findByEmail(registerDto.email);

    // if the user does not exists create the user and the email auth provider
    if (!user) {
      try {
        return this.dbTransactionService.runTransaction(async (session) => {
          const createUserDto: CreateUserDto = {
            name: registerDto.name,
            email: registerDto.email,
            currencyCode: this.getCurrencyCodeFromLocale(locale),
          };
          const newUser = await this.usersService.create(
            createUserDto,
            session,
          );
          const emailActivationData =
            await this.calculateEmailActivationData(-1);
          const createEmailAuthenticationProviderDto: CreateAuthenticationProviderDto =
            {
              providerType: AuthenticationProviderType.EMAIL,
              providerUserId: newUser.email,
              user: newUser.id,
              activationCode: emailActivationData.hashedActivationCode,
              activationCodeExpiresAt:
                emailActivationData.activationCodeExpiresAt,
              activationCodeResendAt:
                emailActivationData.activationCodeResendAt,
              activationCodeRetries: emailActivationData.activationCodeRetries,
            };
          const newEmailAuthenticationProvider =
            new this.authenticationProviderModel(
              createEmailAuthenticationProviderDto,
            );
          const savedEmailAuthenticationProvider =
            await newEmailAuthenticationProvider.save({ session });

          this.sendActivationCodeEmail(
            newUser.email,
            emailActivationData.activationCode,
          );

          return {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            activationCodeResendAt:
              savedEmailAuthenticationProvider.activationCodeResendAt,
          };
        });
      } catch (error) {
        this.logger.error(
          `Failed registering the user: ${error.message}`,
          error.stack,
        );
        throw new HttpException(
          'Error registering the user',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }

    // user exists so we need to check if the email auth provider exists
    const emailAuthenticationProvider = await this.findAuthenticationProvider(
      AuthenticationProviderType.EMAIL,
      registerDto.email,
    );

    // if the email auth provider does not exists create a new one
    if (!emailAuthenticationProvider) {
      const emailActivationData = await this.calculateEmailActivationData(-1);
      const createEmailAuthenticationProviderDto: CreateAuthenticationProviderDto =
        {
          providerType: AuthenticationProviderType.EMAIL,
          providerUserId: user.email,
          user: user.id,
          activationCode: emailActivationData.hashedActivationCode,
          activationCodeExpiresAt: emailActivationData.activationCodeExpiresAt,
          activationCodeResendAt: emailActivationData.activationCodeResendAt,
          activationCodeRetries: emailActivationData.activationCodeRetries,
        };
      const newEmailAuthenticationProvider =
        new this.authenticationProviderModel(
          createEmailAuthenticationProviderDto,
        );
      await newEmailAuthenticationProvider.save();

      this.sendActivationCodeEmail(
        user.email,
        emailActivationData.activationCode,
      );

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        activationCodeResendAt: emailActivationData.activationCodeResendAt,
      };
    }

    // if the email auth provider exists check if the user is already active
    if (
      emailAuthenticationProvider.status === AuthenticationProviderStatus.ACTIVE
    ) {
      throw new HttpException('User already exists', HttpStatus.CONFLICT);
    }

    // if the email auth provider exists and the user is not active, resend the activation code

    // check if the resend limit is reached
    if (emailAuthenticationProvider.activationCodeResendAt > new Date()) {
      throw new HttpException(
        'Resend limit reached',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // calculate the activation code data
    const emailActivationData = await this.calculateEmailActivationData(
      emailAuthenticationProvider.activationCodeRetries,
    );

    // update the user and the email auth provider
    try {
      return this.dbTransactionService.runTransaction(async (session) => {
        const savedUser = await this.usersService.update(
          user.id,
          {
            name: registerDto.name,
          },
          session,
        );

        const savedEmailAuthenticationProvider =
          await this.updateAuthenticationProvider(
            emailAuthenticationProvider.id,
            {
              activationCode: emailActivationData.hashedActivationCode,
              activationCodeExpiresAt:
                emailActivationData.activationCodeExpiresAt,
              activationCodeResendAt:
                emailActivationData.activationCodeResendAt,
              activationCodeRetries: emailActivationData.activationCodeRetries,
              status: AuthenticationProviderStatus.UNVERIFIED,
            },
            session,
          );

        this.sendActivationCodeEmail(
          savedUser.email,
          emailActivationData.activationCode,
        );

        return {
          id: savedUser.id,
          name: savedUser.name,
          email: savedUser.email,
          activationCodeResendAt:
            savedEmailAuthenticationProvider.activationCodeResendAt,
        };
      });
    } catch (error) {
      this.logger.error(
        `Failed registering the user: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error registering the user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
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

    if (
      !emailAuthenticationProvider ||
      emailAuthenticationProvider.status !==
        AuthenticationProviderStatus.UNVERIFIED
    ) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    if (emailAuthenticationProvider.activationCodeResendAt > new Date()) {
      throw new HttpException(
        'Resend limit reached',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const activationCodeData = await this.calculateEmailActivationData(
      emailAuthenticationProvider.activationCodeRetries,
    );
    await this.updateAuthenticationProvider(emailAuthenticationProvider.id, {
      activationCode: activationCodeData.hashedActivationCode,
      activationCodeExpiresAt: activationCodeData.activationCodeExpiresAt,
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
  async verifyEmail(verifyEmailDto: VerifyEmailDto): Promise<Credentials> {
    const emailAuthenticationProvider = await this.findAuthenticationProvider(
      AuthenticationProviderType.EMAIL,
      verifyEmailDto.email,
    );

    if (
      !emailAuthenticationProvider ||
      emailAuthenticationProvider.status !==
        AuthenticationProviderStatus.UNVERIFIED
    ) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    if (
      emailAuthenticationProvider.setPasswordLastSentAt &&
      emailAuthenticationProvider.setPasswordLastSentAt > new Date()
    ) {
      throw new HttpException(
        'Reset password limit reached',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const validActivationCode = await compare(
      verifyEmailDto.activationCode,
      emailAuthenticationProvider.activationCode,
    );

    if (
      !validActivationCode ||
      emailAuthenticationProvider.activationCodeExpiresAt < new Date()
    ) {
      throw new HttpException(
        'Invalid activation code',
        HttpStatus.BAD_REQUEST,
      );
    }

    const emailAuthData: UpdateAuthenticationProviderDto = {
      setPasswordRetries: emailAuthenticationProvider.setPasswordRetries + 1,
    };

    // if the limit is reached, set the last sent date to tomorrow
    if (emailAuthData.setPasswordRetries === PASSWORD_RESET_LIMIT_MAX) {
      // can send again tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      emailAuthData.setPasswordLastSentAt = tomorrow;
      emailAuthData.setPasswordRetries = 0;
      emailAuthData.setPasswordToken = null;
      emailAuthData.setPasswordExpiresAt = null;
    }

    // generate a jwt token for set password step validation
    const payload = { sub: emailAuthenticationProvider.id };
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow(JWT_SET_PASSWORD_SECRET),
      expiresIn: JWT_SET_PASSWORD_EXPIRATION_TIME,
    });
    const hashedAccessToken = await hash(
      accessToken,
      Number(PASSWORD_RESET_TOKEN_BYCRYPT_SALT),
    );
    emailAuthData.setPasswordToken = hashedAccessToken;
    emailAuthData.setPasswordExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiry
    emailAuthData.status = AuthenticationProviderStatus.VERIFIED_NO_PASSWORD;
    emailAuthData.activationCode = null;
    emailAuthData.activationCodeExpiresAt = null;
    emailAuthData.activationCodeResendAt = null;
    emailAuthData.activationCodeRetries = 0;

    await this.updateAuthenticationProvider(
      emailAuthenticationProvider.id,
      emailAuthData,
    );

    return {
      access_token: accessToken,
    };
  }

  /**
   * Set the password of the user.
   * @param authId The id of the auth provider to set the password.
   * @param setPasswordToken The token to set the password.
   * @param password The password to set.
   * @returns The session created.
   * @async
   */
  async setPassword(
    setPasswordToken: string,
    password: string,
  ): Promise<Credentials> {
    let authId: string;

    try {
      const payload = this.jwtService.verify(setPasswordToken, {
        secret: this.configService.getOrThrow(JWT_SET_PASSWORD_SECRET),
      });
      authId = payload.sub;
    } catch (error) {
      this.logger.error(
        `Failed to verify set password token: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Invalid set password token',
        HttpStatus.BAD_REQUEST,
      );
    }

    const emailAuthenticationProvider =
      await this.authenticationProviderModel.findById(authId);

    if (
      !emailAuthenticationProvider ||
      emailAuthenticationProvider.providerType !==
        AuthenticationProviderType.EMAIL ||
      emailAuthenticationProvider.status !==
        AuthenticationProviderStatus.VERIFIED_NO_PASSWORD
    ) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    const validSetPasswordToken = await compare(
      setPasswordToken,
      emailAuthenticationProvider.setPasswordToken,
    );

    if (!validSetPasswordToken) {
      throw new HttpException(
        'Invalid set password token',
        HttpStatus.BAD_REQUEST,
      );
    }

    // generate the tokens to login the user
    const tokens = await this.getTokens(
      emailAuthenticationProvider.id,
      emailAuthenticationProvider.user.id,
    );

    const hashedPassword = await hash(password, Number(PASSWORD_BYCRYPT_SALT));
    const hashedRefreshToken = await hash(
      tokens.refreshToken,
      Number(PASSWORD_BYCRYPT_SALT),
    );
    const data = {
      password: hashedPassword,
      status: AuthenticationProviderStatus.ACTIVE,
      setPasswordToken: null,
      setPasswordExpiresAt: null,
      setPasswordRetries: 0,
      setPasswordLastSentAt: null,
      refreshToken: hashedRefreshToken,
    };
    await this.updateAuthenticationProvider(
      emailAuthenticationProvider.id,
      data,
    );

    return {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    };
  }

  /**
   * Login a user.
   * @param providerType The type of the authentication provider.
   * @param providerUserId The user id of the authentication provider.
   * @param rememberMe If the login is remembered
   * @returns The access token.
   * @async
   */
  async login(
    providerType: AuthenticationProviderType,
    providerUserId: string,
    rememberMe: boolean = false,
  ): Promise<Credentials> {
    // check if the user exists
    const authenticationProvider = await this.findAuthenticationProvider(
      providerType,
      providerUserId,
    );
    if (
      !authenticationProvider ||
      authenticationProvider.status !== AuthenticationProviderStatus.ACTIVE
    ) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    const tokens = await this.getTokens(
      authenticationProvider.id,
      authenticationProvider.user.id,
      rememberMe,
    );

    const hashedRefreshToken = await hash(
      tokens.refreshToken,
      Number(PASSWORD_BYCRYPT_SALT),
    );
    const data = {
      refreshToken: hashedRefreshToken,
    };
    await this.updateAuthenticationProvider(authenticationProvider.id, data);

    return {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    };
  }

  /**
   * Logout a user.
   * @param authId The id of the auth provider to logout.
   * @returns The session created.
   * @async
   */
  async logout(authId: string) {
    return this.updateAuthenticationProvider(authId, { refreshToken: null });
  }

  /**
   * Refresh the access token and refresh token.
   * @param authId The id of the auth provider to refresh the tokens.
   * @param refreshToken The refresh token to refresh the tokens.
   * @param isLongLived If the refresh token is long lived.
   * @returns The new access token and refresh token.
   * @async
   */
  async refreshTokens(
    authId: string,
    refreshToken: string,
    isLongLived: boolean,
  ) {
    const authenticationProvider =
      await this.findAuthenticationProviderById(authId);

    if (!authenticationProvider || !authenticationProvider.refreshToken) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    const isValidrefreshToken = await compare(
      refreshToken,
      authenticationProvider.refreshToken,
    );
    if (!isValidrefreshToken) {
      throw new HttpException('Invalid refresh token', HttpStatus.BAD_REQUEST);
    }

    const tokens = await this.getTokens(
      authenticationProvider.id,
      authenticationProvider.user.id,
      isLongLived,
    );
    const hashedRefreshToken = await hash(
      tokens.refreshToken,
      Number(PASSWORD_BYCRYPT_SALT),
    );
    const data = {
      refreshToken: hashedRefreshToken,
    };
    await this.updateAuthenticationProvider(authenticationProvider.id, data);
    return {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      isLongLived,
    };
  }

  /**
   * Send an email with a link to reset the password.
   * @param email The email of the user to reset the password.
   * @async
   */
  async forgotPassword(email: string): Promise<void> {
    const emailAuthenticationProvider = await this.findAuthenticationProvider(
      AuthenticationProviderType.EMAIL,
      email,
    );
    if (
      !emailAuthenticationProvider ||
      emailAuthenticationProvider.status !== AuthenticationProviderStatus.ACTIVE
    ) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    if (
      emailAuthenticationProvider.setPasswordLastSentAt &&
      emailAuthenticationProvider.setPasswordLastSentAt > new Date()
    ) {
      throw new HttpException(
        'Reset password limit reached',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const emailAuthData: UpdateAuthenticationProviderDto = {
      setPasswordRetries: emailAuthenticationProvider.setPasswordRetries + 1,
    };

    // if the limit is reached, set the last sent date to tomorrow
    if (emailAuthData.setPasswordRetries === PASSWORD_RESET_LIMIT_MAX) {
      // can send again tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      emailAuthData.setPasswordLastSentAt = tomorrow;
      emailAuthData.setPasswordRetries = 0;
      emailAuthData.setPasswordToken = null;
      emailAuthData.setPasswordExpiresAt = null;
    }

    // generate a jwt token for set password step validation
    const payload = { sub: emailAuthenticationProvider.id };
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow(JWT_SET_PASSWORD_SECRET),
      expiresIn: JWT_SET_PASSWORD_EXPIRATION_TIME,
    });
    const hashedAccessToken = await hash(
      accessToken,
      Number(PASSWORD_RESET_TOKEN_BYCRYPT_SALT),
    );
    emailAuthData.setPasswordToken = hashedAccessToken;
    emailAuthData.setPasswordExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiry
    emailAuthData.status = AuthenticationProviderStatus.VERIFIED_NO_PASSWORD;

    await this.updateAuthenticationProvider(
      emailAuthenticationProvider.id,
      emailAuthData,
    );

    const resetLink = `${this.configService.getOrThrow(PASSWORD_RESET_URL)}/${accessToken}`;
    this.mailService.sendMail({
      to: emailAuthenticationProvider.user.email,
      subject: this.i18n.t('resetPassword.subject'),
      template: 'resetPassword',
      context: {
        resetLink,
        year: new Date().getFullYear(),
      },
    });
  }

  /**
   * Validate the reset password token.
   * @param token The reset password token to validate.
   * @returns True if the token is valid, false otherwise.
   * @async
   */
  async validateResetPasswordToken(token: string) {
    let authId: string;
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.getOrThrow(JWT_SET_PASSWORD_SECRET),
      });
      authId = payload.sub;
    } catch (error) {
      this.logger.error(
        `Failed to verify reset password token: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Invalid reset password token',
        HttpStatus.BAD_REQUEST,
      );
    }
    const emailAuthenticationProvider =
      await this.authenticationProviderModel.findById(authId);
    if (
      !emailAuthenticationProvider ||
      emailAuthenticationProvider.providerType !==
        AuthenticationProviderType.EMAIL ||
      emailAuthenticationProvider.status !==
        AuthenticationProviderStatus.VERIFIED_NO_PASSWORD
    ) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    const validResetPasswordToken = await compare(
      token,
      emailAuthenticationProvider.setPasswordToken,
    );
    if (!validResetPasswordToken) {
      throw new HttpException(
        'Invalid reset password token',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (
      emailAuthenticationProvider.setPasswordExpiresAt < new Date() ||
      emailAuthenticationProvider.setPasswordLastSentAt > new Date()
    ) {
      throw new HttpException(
        'Reset password token expired',
        HttpStatus.BAD_REQUEST,
      );
    }
    return true;
  }

  /**
   * Login a user with google.
   * @param googleLogin The data to login with google.
   * @param locale The locale of the user to login.
   * @returns The session created.
   * @async
   */
  async googleLogin(googleLogin: GoogleLoginDto, locale: string) {
    let googleAuthenticationProvider = await this.findAuthenticationProvider(
      AuthenticationProviderType.GOOGLE,
      googleLogin.id,
    );

    if (!googleAuthenticationProvider) {
      let user = await this.usersService.findByEmail(googleLogin.email);
      try {
        googleAuthenticationProvider =
          await this.dbTransactionService.runTransaction(async (session) => {
            // if the user does not exists create the user and the google authentication
            if (!user) {
              const createUserDto: CreateUserDto = {
                name: googleLogin.displayName,
                email: googleLogin.email,
                picture: googleLogin.picture,
                currencyCode: this.getCurrencyCodeFromLocale(locale),
              };
              user = await this.usersService.create(createUserDto, session);
            }

            // create the google authentication provider
            const createAuthenticationDto: CreateAuthenticationProviderDto = {
              providerType: AuthenticationProviderType.GOOGLE,
              providerUserId: googleLogin.id,
              user: user.id,
              status: AuthenticationProviderStatus.ACTIVE,
            };
            const newAuthenticationProviderModel =
              new this.authenticationProviderModel(createAuthenticationDto);
            const newAuthenticationProviderDocument =
              await newAuthenticationProviderModel.save({ session });

            return plainToClass(
              AuthenticationProviderDto,
              newAuthenticationProviderDocument.toObject(),
            );
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

    return this.login(
      AuthenticationProviderType.GOOGLE,
      googleAuthenticationProvider.providerUserId,
      true, // remember me is true for google login
    );
  }

  /**
   * Returns the user data for the given auth provider id.
   * @param authId The id of the auth provider.
   * @returns The user data.
   * @async
   */
  public async me(authId: string): Promise<UserDto> {
    const authenticationProvider =
      await this.findAuthenticationProviderById(authId);
    if (!authenticationProvider) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    return authenticationProvider.user;
  }

  /**
   * get the currency code from the locale.
   * @param locale The locale to get the currency code from.
   * @return The currency code.
   * @private
   */
  private getCurrencyCodeFromLocale(locale: string): CurrencyCode {
    const currencyByLocale: Record<string, CurrencyCode> = {
      'en-US': CurrencyCode.USD,
      'es-CO': CurrencyCode.COP,
    };

    return currencyByLocale[locale] || CurrencyCode.USD; // Default to USD if no currency code is found
  }

  /**
   * Send an email with the activation code.
   * @param to The email to send the activation code.
   * @param activationCode The activation code to send.
   * @async
   */
  private async sendActivationCodeEmail(to: string, activationCode: string) {
    this.mailService.sendMail({
      to,
      subject: this.i18n.t('emailConfirmation.subject'),
      template: 'emailConfirmation',
      context: {
        code: activationCode,
        year: new Date().getFullYear(),
      },
    });
  }

  /**
   * Get the activation code data calculated based on current date
   * @param retries The number of retries to calculate the activation code data.
   * @returns The activation code.
   * @async
   */
  private async calculateEmailActivationData(
    retries: number,
  ): Promise<ActivationDataDto> {
    const activationCode = generateActivationCode();
    const hashedActivationCode = await hash(
      activationCode,
      Number(ACTIVATION_CODE_BYCRYPT_SALT),
    );
    const activationCodeData = {
      activationCode,
      hashedActivationCode,
      activationCodeExpiresAt: new Date(
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
  ): Promise<AuthenticationProviderDto | null> {
    try {
      const authenticationProvider =
        await this.authenticationProviderModel.findOne({
          providerType,
          providerUserId,
        });
      if (!authenticationProvider) return null;
      return plainToClass(
        AuthenticationProviderDto,
        authenticationProvider.toObject(),
      );
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
   * Find an authentication provider by id.
   * @param id The id of the authentication provider to find.
   * @returns The authentication provider found.
   * @async
   */
  private async findAuthenticationProviderById(
    id: string,
  ): Promise<AuthenticationProviderDto> {
    try {
      const authenticationProvider =
        await this.authenticationProviderModel.findById(id);
      if (!authenticationProvider) return null;
      return plainToClass(
        AuthenticationProviderDto,
        authenticationProvider.toObject(),
      );
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
   * Update an authentication provider by id.
   * @param id The id of the authentication provider to update.
   * @param updateAuthenticationProviderDto The data to update the authentication provider.
   * @param session The session to use for the transaction.
   * @returns The authentication provider updated.
   * @async
   */
  private async updateAuthenticationProvider(
    id: string,
    updateAuthenticationProviderDto: UpdateAuthenticationProviderDto,
    session?: ClientSession,
  ) {
    try {
      const authenticationProvider =
        await this.authenticationProviderModel.findById(id);

      if (!authenticationProvider) {
        throw new HttpException(
          'Authentication provider not found',
          HttpStatus.NOT_FOUND,
        );
      }

      authenticationProvider.set(updateAuthenticationProviderDto);
      const updatedAuthenticationProvider = await authenticationProvider.save({
        session,
      });
      return plainToClass(
        AuthenticationProviderDto,
        updatedAuthenticationProvider.toObject(),
      );
    } catch (error) {
      this.logger.error(
        `Failed to update authentication provider: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error updating the authentication provider',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * generate a new access token and refresh token
   * @param userId The id of the user to generate the tokens.
   * @param name The name of the user to generate the tokens.
   * @param isLongLived If the tokens should be long lived.
   * @returns The tokens generated.
   * @async
   */
  private async getTokens(
    authId: string,
    userId: string,
    isLongLived: boolean = false,
  ) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: authId,
          userId,
        },
        {
          secret: this.configService.getOrThrow(JWT_SECRET),
          expiresIn: JWT_EXPIRATION_TIME,
        },
      ),
      this.jwtService.signAsync(
        {
          sub: authId,
          isLongLived,
        },
        {
          secret: this.configService.getOrThrow(JWT_REFRESH_SECRET),
          expiresIn: isLongLived
            ? JWT_REFRESH_LONG_LIVED_EXPIRATION_TIME
            : JWT_REFRESH_EXPIRATION_TIME,
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }
}
