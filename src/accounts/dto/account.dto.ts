import { Type } from 'class-transformer';
import { CurrencyCode } from 'src/shared/entities/currency-code.enum';
import { UserDto } from 'src/users/dto/user.dto';
import { AccountTypeDto } from '../../account-types/dto/account-type.dto';

export class AccountDto {
  id: string;
  name: string;
  balance: number;
  currencyCode: CurrencyCode;

  @Type(() => AccountTypeDto)
  accountType: AccountTypeDto;

  @Type(() => UserDto)
  user: UserDto;
}
