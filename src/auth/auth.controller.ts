import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { LocalAuthGuard } from './local-auth.guard';
import { RegisterDto } from './dto/register.dto';
import { AuthenticatedRequest } from 'src/shared/types';
import { Session } from './types';
import { EmailRegisteredDto } from './dto/email-registered.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { PasswordDto } from './dto/password.dto';
import { EmailDto } from './dto/email.dto';
import { RegisterResponseDto } from './dto/register-response.dto';
import { ResendActivationCodeDto } from './dto/resend-activation-code.dto';
import { UserSessionDto } from './dto/user-session.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

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
   * Register a new user.
   * @param registerDto The data to register the user.
   * @returns The user created.
   * @async
   */
  @Public()
  @Post('register')
  register(@Body() registerDto: RegisterDto): Promise<RegisterResponseDto> {
    return this.authService.register(registerDto);
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
  verifyEmail(@Body() verifyEmailDto: VerifyEmailDto): Promise<Session> {
    return this.authService.verifyEmail(verifyEmailDto);
  }

  /**
   * Set the password of the user.
   * @param setPasswordDto The data to set the password.
   * @returns The session created.
   * @async
   */
  @Post('set-password')
  setPassword(
    @Request() req: AuthenticatedRequest,
    @Body() passwordDto: PasswordDto,
  ): Promise<Session> {
    return this.authService.setPassword(req.user.id, passwordDto.password);
  }

  /**
   * Get the user profile.
   * @param req The request object.
   * @returns The user profile.
   * @async
   */
  @Get('me')
  me(@Request() req: AuthenticatedRequest): Promise<UserSessionDto> {
    return this.authService.me(req.user.id);
  }

  /**
   * Log in a user.
   * @param req The request object.
   * @returns The session created.
   * @async
   */
  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  login(@Request() req: AuthenticatedRequest): Promise<Session> {
    return this.authService.login(req.user.id);
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
}
