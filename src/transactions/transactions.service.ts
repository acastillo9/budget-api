import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Transaction } from './entities/transaction.entity';
import { Connection, Model } from 'mongoose';
import { TransactionType } from './entities/transaction-type.enum';
import { AccountsService } from 'src/accounts/accounts.service';
import { TransactionDto } from './dto/transaction.dto';
import { plainToClass } from 'class-transformer';
import { TransactionsQueryDto } from './dto/transactions-query.dto';

@Injectable()
export class TransactionsService {
  private readonly logger: Logger = new Logger(TransactionsService.name);

  constructor(
    @InjectModel(Transaction.name) private transactionModel: Model<Transaction>,
    @InjectConnection() private readonly connection: Connection,
    private accountsService: AccountsService,
  ) {}

  /**
   * Create a new transaction.
   * @param createTransactionDto The data to create the transaction.
   * @param userId The id of the user to create the transaction.
   * @returns The transaction created.
   * @async
   */
  async create(
    createTransactionDto: CreateTransactionDto,
    userId: string,
  ): Promise<TransactionDto> {
    const newTransaction = {
      ...createTransactionDto,
      user: userId,
      amount:
        createTransactionDto.transactionType === TransactionType.EXPENSE
          ? -createTransactionDto.amount
          : createTransactionDto.amount,
    };

    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      // save the transaction
      const savedTransaction = await new this.transactionModel(
        newTransaction,
      ).save();

      // then add the amount to the account balance if the transaction is paid
      if (savedTransaction.paid) {
        const account = await this.accountsService.addAccountBalance(
          savedTransaction.account.id,
          savedTransaction.amount,
        );
        savedTransaction.account.balance = account.balance;
      }

      await session.commitTransaction();
      return plainToClass(TransactionDto, savedTransaction.toObject());
    } catch (error) {
      await session.abortTransaction();
      this.logger.error(
        `Failed to create transaction: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error creating the transaction',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      await session.endSession();
    }
  }

  /**
   * Find all transactions of an user. The filter can be by account, month and year.
   * @param query The query parameters to filter the transactions.
   * @param userId The id of the user to find the transactions.
   * @returns The transactions found.
   * @async
   */
  async findAll(query: TransactionsQueryDto, userId: string) {
    if (!query.month || !query.year) {
      throw new HttpException(
        'Invalid query parameters',
        HttpStatus.BAD_REQUEST,
      );
    }

    const dbQuery: Record<string, any> = { user: userId };
    if (query.accountId) {
      dbQuery['account'] = query.accountId;
    }

    if (query.month && query.year) {
      const startOfMonth = new Date(query.year, query.month - 1, 1);
      const endOfMonth = new Date(query.year, query.month, 1);
      dbQuery['startDate'] = { $gte: startOfMonth, $lt: endOfMonth };
    }

    try {
      const transactions = await this.transactionModel.find(dbQuery);
      return transactions.map((transaction) =>
        plainToClass(TransactionDto, transaction.toObject()),
      );
    } catch (error) {
      this.logger.error(
        `Failed to find transactions for user ${userId} with query ${JSON.stringify(query)}: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error finding the transactions',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Find a transaction by id.
   * @param id The id of the transaction to find.
   * @param userId The id of the user to find the transaction.
   * @returns The transaction found.
   * @async
   */
  async findOne(id: string, userId: string): Promise<TransactionDto> {
    try {
      const transaction = await this.transactionModel.findOne({
        _id: id,
        user: userId,
      });
      if (!transaction) {
        throw new HttpException('Transaction not found', HttpStatus.NOT_FOUND);
      }
      return plainToClass(TransactionDto, transaction.toObject());
    } catch (error) {
      this.logger.error(
        `Failed to find transaction: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error finding the transaction',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update a transaction by id.
   * @param id The id of the transaction to update.
   * @param updateTransactionDto The data to update the transaction.
   * @param userId The id of the user to update the transaction.
   * @returns The transaction updated.
   * @async
   */
  async update(
    id: string,
    updateTransactionDto: UpdateTransactionDto,
    userId: string,
  ): Promise<TransactionDto> {
    const oldTransaction = await this.findOne(id, userId);

    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      // update the transaction
      const updatedTransaction = await this.transactionModel.findOneAndUpdate(
        { _id: id, user: userId },
        {
          ...updateTransactionDto,
          amount:
            updateTransactionDto.transactionType === TransactionType.EXPENSE
              ? -updateTransactionDto.amount
              : updateTransactionDto.amount,
        },
        { new: true },
      );

      // fix the account balance if the transaction was paid or the amount was changed
      if (updatedTransaction.paid != oldTransaction.paid) {
        const account = await this.accountsService.addAccountBalance(
          updatedTransaction.account.id,
          updatedTransaction.paid
            ? updatedTransaction.amount
            : -oldTransaction.amount,
        );
        updatedTransaction.account.balance = account.balance;
      } else if (
        updatedTransaction.paid &&
        updatedTransaction.amount !== oldTransaction.amount
      ) {
        const amountDiff = updatedTransaction.amount - oldTransaction.amount;
        const account = await this.accountsService.addAccountBalance(
          updatedTransaction.account.id,
          amountDiff,
        );
        updatedTransaction.account.balance = account.balance;
      }

      await session.commitTransaction();
      return plainToClass(TransactionDto, updatedTransaction.toObject());
    } catch (error) {
      await session.abortTransaction();
      this.logger.error(
        `Failed to update transaction: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error updating the transaction',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      await session.endSession();
    }
  }

  /**
   * Remove a transaction by id.
   * @param id The id of the transaction to remove.
   * @param userId The id of the user to remove the transaction.
   * @returns The transaction removed.
   * @async
   */
  async remove(id: string, userId: string): Promise<TransactionDto> {
    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      const transaction = await this.transactionModel.findOneAndDelete({
        _id: id,
        user: userId,
      });
      if (!transaction) {
        throw new HttpException('Transaction not found', HttpStatus.NOT_FOUND);
      }

      // if is a paid transaction, remove the amount from the account balance
      if (transaction.paid) {
        const account = await this.accountsService.addAccountBalance(
          transaction.account.id,
          -transaction.amount,
        );
        transaction.account.balance = account.balance;
      }
      await session.commitTransaction();
      return plainToClass(TransactionDto, transaction.toObject());
    } catch (error) {
      await session.abortTransaction();
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Failed to remove transaction: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error removing the transaction',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      await session.endSession();
    }
  }
}
