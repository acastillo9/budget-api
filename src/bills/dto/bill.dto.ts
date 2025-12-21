import { AccountDto } from 'src/accounts/dto/account.dto';
import { BillFrequency } from '../entities/bill-frequency.enum';
import { Type } from 'class-transformer';
import { UserDto } from 'src/users/dto/user.dto';
import { CategoryDto } from 'src/categories/dto/category.dto';

export class BillDto {
  id: string;
  name: string;
  amount: number;
  dueDate: Date;
  endDate?: Date;
  frequency: BillFrequency;

  @Type(() => AccountDto)
  account: AccountDto;

  @Type(() => CategoryDto)
  category: CategoryDto;

  @Type(() => UserDto)
  user: UserDto;
}
