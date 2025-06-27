import { IsEnum, IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { AccountType } from '../entities/account-type.enum';
import { CurrencyCode } from 'src/shared/entities/currency-code.enum';

export class CreateAccountDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsEnum(CurrencyCode)
  currencyCode: CurrencyCode;

  @IsNumber()
  balance: number;

  @IsEnum(AccountType)
  accountType: AccountType;

  user?: string;
}
