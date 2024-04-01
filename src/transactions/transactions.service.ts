import { Injectable } from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionResponseDto } from './dto/transaction-response.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Transaction } from './entities/transaction.entity';
import { Model } from 'mongoose';
import { TransactionType } from './entities/transaction-type.enum';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectModel(Transaction.name) private transactionModel: Model<Transaction>,
  ) {}

  async create(
    createTransactionDto: CreateTransactionDto,
  ): Promise<TransactionResponseDto> {
    return new this.transactionModel({
      ...createTransactionDto,
      amount:
        createTransactionDto.transactionType === TransactionType.EXPENSE
          ? -createTransactionDto.amount
          : createTransactionDto.amount,
      creationDate: new Date(),
    })
      .save()
      .then(TransactionResponseDto.fromTransaction);
  }

  async findAll(): Promise<TransactionResponseDto[]> {
    return this.transactionModel
      .find()
      .exec()
      .then((transactions) =>
        transactions.map(TransactionResponseDto.fromTransaction),
      );
  }

  async findOne(id: string): Promise<TransactionResponseDto> {
    return this.transactionModel
      .findById(id)
      .exec()
      .then(TransactionResponseDto.fromTransaction);
  }

  async update(
    id: string,
    updateTransactionDto: UpdateTransactionDto,
  ): Promise<TransactionResponseDto> {
    return this.transactionModel
      .findByIdAndUpdate(id, {
        ...updateTransactionDto,
        amount:
          updateTransactionDto.transactionType === TransactionType.EXPENSE
            ? -updateTransactionDto.amount
            : updateTransactionDto.amount,
        updateDate: new Date(),
      })
      .exec()
      .then(TransactionResponseDto.fromTransaction);
  }

  async remove(id: string): Promise<TransactionResponseDto> {
    return this.transactionModel
      .findByIdAndDelete(id)
      .exec()
      .then(TransactionResponseDto.fromTransaction);
  }
}
