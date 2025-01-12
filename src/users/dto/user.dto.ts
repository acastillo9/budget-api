import { Exclude } from 'class-transformer';

export class UserDto {
  id: string;
  name: string;
  email: string;

  @Exclude()
  password: string;

  activationCode: string;
  activationCodeExpires: Date;
  activationCodeResendAt: Date;
  activationCodeRetries: number;
  status: string;
}
