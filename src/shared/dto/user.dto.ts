import { Exclude } from 'class-transformer';

export class UserDto {
  id: string;
  name: string;
  email: string;

  @Exclude()
  password: string;

  @Exclude()
  activationCode: string;

  @Exclude()
  activationCodeExpires: Date;

  @Exclude()
  status: string;
}
