import { Type } from 'class-transformer';
import { AccountDto } from 'src/accounts/dto/account.dto';
import CategoryDto from 'src/categories/dto/category.dto';
import { UserDto } from 'src/users/dto/user.dto';

export class TransactionDto {
  id: string;
  transactionType: string;
  amount: number;
  startDate: Date;
  endDate: Date;
  repeatType: string;
  description: string;
  paid: boolean;
  createdAt: Date;
  updatedAt: Date;

  @Type(() => CategoryDto)
  category: CategoryDto;

  @Type(() => AccountDto)
  account: AccountDto;

  @Type(() => UserDto)
  user: UserDto;
}
