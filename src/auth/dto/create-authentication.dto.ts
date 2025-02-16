import { AuthenticationProviderType } from '../entities/authentication-provider-type.enum';

export class CreateAuthenticationDto {
  providerUserId: string;
  providerType: AuthenticationProviderType;
  user: string;
}
