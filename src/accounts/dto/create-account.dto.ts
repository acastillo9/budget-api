import {
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsString,
} from 'class-validator';
import { CurrencyCode } from 'src/shared/entities/currency-code.enum';

export class CreateAccountDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsEnum(CurrencyCode)
  currencyCode: CurrencyCode;

  @IsNumber()
  balance: number;

  @IsMongoId()
  accountType: string;
}
