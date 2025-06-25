import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { LocalAuthGuard } from './local-auth.guard';
import { RegisterDto } from './dto/register.dto';
import { AuthenticatedRequest } from 'src/core/types';
import { GoogleAuthenticatedRequest, Credentials } from './types';
import { EmailRegisteredDto } from './dto/email-registered.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { EmailDto } from './dto/email.dto';
import { RegisterResponseDto } from './dto/register-response.dto';
import { ResendActivationCodeDto } from './dto/resend-activation-code.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleOAuthGuard } from './google-oauth.guard';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { JwtRefreshGuard } from './jwt-refresh.guard';
import { AuthenticationProviderType } from './entities/authentication-provider-type.enum';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  /**
   * Check if the user exists.
   * @param req The request object.
   * @returns True if the user exists, false otherwise.
   * @async
   */
  @Public()
  @Get('email-registered')
  isEmailRegistered(
    @Query('email') email: string,
  ): Promise<EmailRegisteredDto> {
    return this.authService.isEmailRegistered(email);
  }

  /**
   * Register a new user by email.
   * @param registerDto The data to register the user.
   * @returns The user created.
   * @async
   */
  @Public()
  @Post('register')
  register(@Body() registerDto: RegisterDto): Promise<RegisterResponseDto> {
    return this.authService.registerByEmail(registerDto);
  }

  /**
   * Resend the activation email.
   * @param emailDto The email to resend the activation email.
   * @returns The response of the resend.
   * @async
   */
  @Public()
  @Post('resend-activation-code')
  resendActivationCode(
    @Body() emailDto: EmailDto,
  ): Promise<ResendActivationCodeDto> {
    return this.authService.resendActivationCode(emailDto.email);
  }

  /**
   * Verify the email of the user.
   * @param verifyEmailDto The data to verify the email.
   * @returns The session created.
   * @async
   */
  @Public()
  @Post('verify-email')
  verifyEmail(@Body() verifyEmailDto: VerifyEmailDto): Promise<Credentials> {
    return this.authService.verifyEmail(verifyEmailDto);
  }

  /**
   * Set the password of the user.
   * @param setPasswordDto The data to set the password.
   * @returns The session created.
   * @async
   */
  @Public()
  @Post('set-password/:token')
  setPassword(
    @Param('token') token: string,
    @Body() passwordDto: SetPasswordDto,
  ): Promise<Credentials> {
    return this.authService.setPassword(token, passwordDto.password);
  }

  /**
   * Log in a user.
   * @param req The request object.
   * @param loginDto The data to log in the user.
   * @returns The session created.
   * @async
   */
  @Public()
  @Post('login')
  @UseGuards(LocalAuthGuard)
  login(@Body() loginDto: LoginDto): Promise<Credentials> {
    return this.authService.login(
      AuthenticationProviderType.EMAIL,
      loginDto.email,
      loginDto.rememberMe,
    );
  }

  /**
   * Get the user profile.
   * @param req The request object.
   * @returns The user profile.
   * @async
   */
  @Get('me')
  me(@Req() req: AuthenticatedRequest) {
    return {
      id: req.user.userId,
      name: req.user.name,
      email: req.user.email,
      picture: req.user.picture,
    };
  }

  /**
   * Log out the user.
   * @param req The request object.
   * @returns The response of the logout.
   * @async
   */
  @Post('logout')
  logout(@Req() req: AuthenticatedRequest) {
    this.authService.logout(req.user.authId);
  }

  /**
   * Refresh the access token.
   * @param req The request object.
   * @returns The new access token.
   * @async
   */
  @Public()
  @Get('refresh')
  @UseGuards(JwtRefreshGuard)
  refreshTokens(@Req() req: AuthenticatedRequest) {
    const authId = req.user.authId;
    const refreshToken = req.user.refreshToken;
    const isLongLived = req.user.isLongLived;
    return this.authService.refreshTokens(authId, refreshToken, isLongLived);
  }

  /**
   * Forgot password.
   * @param emailDto The email to send the forgot password email.
   * @returns The response of the forgot password.
   * @async
   */
  @Public()
  @Post('forgot-password')
  forgotPassword(@Body() emailDto: EmailDto): Promise<void> {
    return this.authService.forgotPassword(emailDto.email);
  }

  /**
   * Verify the reset password token.
   * @param token The reset password token.
   * @returns True if the token is valid, false otherwise.
   * @async
   */
  @Public()
  @Get('verify-set-password-token/:token')
  verifySetPasswordToken(@Param('token') token: string): Promise<boolean> {
    return this.authService.validateResetPasswordToken(token);
  }

  /**
   * Google OAuth.
   * @async
   */
  @Public()
  @Get('google')
  @UseGuards(GoogleOAuthGuard)
  async googleAuth() {}

  /**
   * Google OAuth redirect.
   * @param req The request object.
   * @param res The response object.
   * @async
   */
  @Public()
  @Get('google-redirect')
  @UseGuards(GoogleOAuthGuard)
  async googleAuthRedirect(
    @Req() req: GoogleAuthenticatedRequest,
    @Res() res: Response,
  ) {
    const session: Credentials = await this.authService.googleLogin(req);
    return res.redirect(
      301,
      `${this.configService.getOrThrow('GOOGLE_CLIENT_CALLBACK_URL')}?access_token=${session.access_token}&refresh_token=${session.refresh_token}`,
    );
  }
}
