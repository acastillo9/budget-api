import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CurrencyCode } from 'src/shared/entities/currency-code.enum';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  picture?: string;

  @IsOptional()
  @IsEnum(CurrencyCode)
  currencyCode?: CurrencyCode;
}
