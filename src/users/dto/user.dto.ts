import { CurrencyCode } from 'src/shared/entities/currency-code.enum';

export class UserDto {
  id: string;
  name: string;
  email: string;
  picture: string;
  currencyCode: CurrencyCode;
}
