export class CreateTransactionDto {
  transactionType: string;
  amount: number;
  currencyCode: string;
  startDate: string;
  endDate: Date;
  repeatType: string;
  description: string;
  category: string;
  paid: boolean;
}
