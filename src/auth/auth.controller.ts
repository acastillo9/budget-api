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
import { AuthenticatedRequest, UserSession } from 'src/shared/types';
import { Session } from './types';
import { UserDto } from 'src/shared/dto/user.dto';
import { EmailRegisteredDto } from './dto/email-registered.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { PasswordDto } from './dto/password.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

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
    return this.authService.login(req.user);
  }

  /**
   * Register a new user.
   * @param registerDto The data to register the user.
   * @returns The user created.
   * @async
   */
  @Public()
  @Post('register')
  register(@Body() registerDto: RegisterDto): Promise<UserDto> {
    return this.authService.register(registerDto);
  }

  /**
   * Get the profile of the user.
   * @param req The request object.
   * @returns The user profile.
   * @async
   */
  @Get('profile')
  getProfile(@Request() req: AuthenticatedRequest): UserSession {
    return req.user;
  }

  /**
   * Check if the user exists.
   * @param req The request object.
   * @returns True if the user exists, false otherwise.
   * @async
   */
  @Public()
  @Get('email-registered')
  exists(@Query('email') email: string): Promise<EmailRegisteredDto> {
    return this.authService.emailRegistered(email);
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
}
