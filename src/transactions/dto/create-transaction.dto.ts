export class CreateTransactionDto {
  transactionType: string;
  amount: number;
  currencyCode: string;
  startDate: Date;
  endDate: Date;
  repeatType: string;
  description: string;
  category: string;
}
