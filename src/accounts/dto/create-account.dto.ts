import { IsEnum, IsNotEmpty } from 'class-validator';
import { CurrencyCode } from '../entities/currency-code.enum';

export class CreateAccountDto {
  @IsNotEmpty()
  name: string;

  @IsNotEmpty()
  @IsEnum(CurrencyCode)
  currencyCode: string;
}
