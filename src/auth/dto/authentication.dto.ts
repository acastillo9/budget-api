import { UserDto } from 'src/users/dto/user.dto';
import { AuthenticationProviderType } from '../entities/authentication-provider-type.enum';

export class AuthenticationDto {
  id: string;
  providerUserId: string;
  providerType: AuthenticationProviderType;
  user: UserDto;
}
