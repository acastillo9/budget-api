import { Type } from 'class-transformer';
import { CurrencyCode } from 'src/shared/entities/currency-code.enum';
import { UserDto } from 'src/users/dto/user.dto';
import { AccountType } from '../entities/account-type.enum';

export class AccountDto {
  id: string;
  name: string;
  balance: number;
  currencyCode: CurrencyCode;
  accountType: AccountType;

  @Type(() => UserDto)
  user: UserDto;
}
