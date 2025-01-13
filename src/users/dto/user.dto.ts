import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class UserDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  email: string;

  password: string;
  activationCode: string;
  activationCodeExpires: Date;
  activationCodeResendAt: Date;
  activationCodeRetries: number;
  resetPasswordRetries: number;
  resetPasswordLastSentAt: Date;
  status: string;
}
