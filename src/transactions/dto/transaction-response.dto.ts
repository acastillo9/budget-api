import CategoryResponseDto from 'src/categories/dto/category-response.dto';
import { TransactionDocument } from '../entities/transaction.entity';

export class TransactionResponseDto {
  id: string;
  transactionType: string;
  amount: number;
  currencyCode: string;
  startDate: Date;
  endDate: Date;
  repeatType: string;
  description: string;
  category: CategoryResponseDto;

  static fromTransaction(
    transaction: TransactionDocument,
  ): TransactionResponseDto {
    const transactionResponseDto = new TransactionResponseDto();
    transactionResponseDto.id = transaction._id.toHexString();
    transactionResponseDto.transactionType = transaction.transactionType;
    transactionResponseDto.amount = transaction.amount;
    transactionResponseDto.currencyCode = transaction.currencyCode;
    transactionResponseDto.startDate = transaction.startDate;
    transactionResponseDto.endDate = transaction.endDate;
    transactionResponseDto.repeatType = transaction.repeatType;
    transactionResponseDto.description = transaction.description;
    transactionResponseDto.category = CategoryResponseDto.fromCategory(
      transaction.category,
    );
    return transactionResponseDto;
  }
}
