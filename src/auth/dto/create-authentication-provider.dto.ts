import { AuthenticationProviderStatus } from '../entities/authentication-provider-status.enum';
import { AuthenticationProviderType } from '../entities/authentication-provider-type.enum';

export class CreateAuthenticationProviderDto {
  providerUserId: string;
  activationCode?: string;
  activationCodeExpiresAt?: Date;
  activationCodeResendAt?: Date;
  activationCodeRetries?: number;
  refreshToken?: string;
  password?: string;
  setPasswordToken?: string;
  setPasswordExpiresAt?: Date;
  setPasswordRetries?: number;
  setPasswordLastSentAt?: Date;
  providerType: AuthenticationProviderType;
  status?: AuthenticationProviderStatus;
  user: string;
}
