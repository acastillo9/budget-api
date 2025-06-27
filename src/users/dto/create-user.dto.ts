import { CurrencyCode } from 'src/shared/entities/currency-code.enum';

export class CreateUserDto {
  name: string;
  email: string;
  picture?: string;
  currencyCode: CurrencyCode;
}
