import { Type } from 'class-transformer';
import { AccountDto } from 'src/accounts/dto/account.dto';
import { CategoryDto } from 'src/categories/dto/category.dto';
import { UserDto } from 'src/users/dto/user.dto';

export class TransactionDto {
  id: string;
  date: Date;
  amount: number;
  description: string;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
  isTransfer: boolean;

  @Type(() => CategoryDto)
  category: CategoryDto;

  @Type(() => AccountDto)
  account: AccountDto;

  @Type(() => TransactionDto)
  transfer: TransactionDto;

  @Type(() => UserDto)
  user: UserDto;
}
