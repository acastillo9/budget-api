import { UserStatus } from '../entities/user-status.enum';

export class CreateUserDto {
  name: string;
  email: string;
  picture?: string;
  password?: string;
  status?: UserStatus;
  activationCode?: string;
  activationCodeExpires?: Date;
  activationCodeResendAt?: Date;
  activationCodeRetries?: number;
  resetPasswordRetries?: number;
  resetPasswordLastSentAt?: Date;
}
