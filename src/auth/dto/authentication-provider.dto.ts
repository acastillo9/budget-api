import { UserDto } from 'src/users/dto/user.dto';
import { AuthenticationProviderType } from '../entities/authentication-provider-type.enum';
import { AuthenticationProviderStatus } from '../entities/authentication-provider-status.enum';

export class AuthenticationProviderDto {
  id: string;
  providerUserId: string;
  activationCode: string;
  activationCodeExpiresAt: Date;
  activationCodeResendAt: Date;
  activationCodeRetries: number;
  password: string;
  refreshToken: string;
  setPasswordToken: string;
  setPasswordRetries: number;
  setPasswordLastSentAt: Date;
  providerType: AuthenticationProviderType;
  status: AuthenticationProviderStatus;
  user: UserDto;
}
