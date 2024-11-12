import { IsEnum, IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { CurrencyCode } from '../entities/currency-code.enum';

export class CreateAccountDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsEnum(CurrencyCode)
  currencyCode: string;

  @IsNumber()
  balance: number;
}
