import { Account } from 'src/accounts/entities/account.entity';
import { BillFrequency } from './bill-frequency.enum';
import { BillStatus } from './bill-status.enum';
import { Category } from 'src/categories/entities/category.entity';

export class BillInstance {
  id: string;
  targetDate: Date;
  name: string;
  amount: number;
  dueDate: Date;
  endDate?: Date;
  status: BillStatus;
  frequency: BillFrequency;
  account: Account;
  category: Category;
  paidDate?: Date;
  transactionId?: string;
  applyToFuture?: boolean;
}
