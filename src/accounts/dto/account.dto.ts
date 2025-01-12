import { Type } from 'class-transformer';
import { UserDto } from 'src/users/dto/user.dto';

export class AccountDto {
  id: string;
  name: string;
  balance: number;
  currencyCode: string;

  @Type(() => UserDto)
  user: UserDto;
}
