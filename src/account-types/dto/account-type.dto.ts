import { AccountCategory } from '../entities/account-category.enum';

export class AccountTypeDto {
  id: string;
  name: string;
  accountCategory: AccountCategory;
}
