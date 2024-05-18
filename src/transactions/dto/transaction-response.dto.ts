import CategoryResponseDto from 'src/categories/dto/category-response.dto';
import { TransactionDocument } from '../entities/transaction.entity';
import { AccountResponseDto } from 'src/accounts/dto/account-response.dto';

export class TransactionResponseDto {
  id: string;
  transactionType: string;
  amount: number;
  startDate: Date;
  endDate: Date;
  repeatType: string;
  description: string;
  category: CategoryResponseDto;
  paid: boolean;
  account: AccountResponseDto;

  static fromTransaction(
    transaction: TransactionDocument,
  ): TransactionResponseDto {
    const transactionResponseDto = new TransactionResponseDto();
    transactionResponseDto.id = transaction._id.toHexString();
    transactionResponseDto.transactionType = transaction.transactionType;
    transactionResponseDto.amount = transaction.amount;
    transactionResponseDto.startDate = transaction.startDate;
    transactionResponseDto.endDate = transaction.endDate;
    transactionResponseDto.repeatType = transaction.repeatType;
    transactionResponseDto.description = transaction.description;
    transactionResponseDto.category = CategoryResponseDto.fromCategory(
      transaction.category,
    );
    transactionResponseDto.paid = transaction.paid;
    transactionResponseDto.account = AccountResponseDto.fromAccount(
      transaction.account,
    );
    return transactionResponseDto;
  }
}
