import { AccountDto } from 'src/accounts/dto/account.dto';
import { BillFrequency } from '../entities/bill-frequency.enum';
import { BillStatus } from '../entities/bill-status.enum';
import { Type } from 'class-transformer';
import { CategoryDto } from 'src/categories/dto/category.dto';

export class BillInstanceDto {
  id: string;
  targetDate: string;
  name: string;
  amount: number;
  dueDate: string;
  endDate?: string;
  status: BillStatus;
  frequency: BillFrequency;
  paidDate?: string;
  transactionId?: string;
  applyToFuture?: boolean;

  @Type(() => AccountDto)
  account: AccountDto;

  @Type(() => CategoryDto)
  category: CategoryDto;
}
