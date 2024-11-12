import { Exclude } from 'class-transformer';

export class UserDto {
  id: string;
  name: string;
  email: string;

  @Exclude()
  password: string;
}
