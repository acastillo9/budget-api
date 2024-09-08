export class CreateTransactionDto {
  transactionType: string;
  amount: number;
  startDate: string;
  endDate: Date;
  repeatType: string;
  description: string;
  category: string;
  paid: boolean;
  account: string;
  user: string;
}
