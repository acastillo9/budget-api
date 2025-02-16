import { Exclude, Expose } from 'class-transformer';
import { UserStatus } from '../entities/user-status.enum';

@Exclude()
export class UserDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  email: string;

  @Expose()
  picture: string;

  password: string;
  activationCode: string;
  activationCodeExpires: Date;
  activationCodeResendAt: Date;
  activationCodeRetries: number;
  resetPasswordRetries: number;
  resetPasswordLastSentAt: Date;
  status: UserStatus;
}
