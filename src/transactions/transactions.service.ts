import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Transaction } from './entities/transaction.entity';
import { Connection, Model } from 'mongoose';
import { AccountsService } from 'src/accounts/accounts.service';
import { TransactionDto } from './dto/transaction.dto';
import { plainToClass } from 'class-transformer';
import { TransactionsQueryDto } from './dto/transactions-query.dto';
import { DbTransactionService } from 'src/shared/db-transaction.service';
import { CategoriesService } from 'src/categories/categories.service';
import { CategoryType } from 'src/categories/entities/category-type.enum';
import { CategoryDto } from 'src/categories/dto/category.dto';
import { I18nService } from 'nestjs-i18n';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { PaginationDto } from 'src/shared/dto/pagination.dto';
import { PaginatedDataDto } from 'src/shared/dto/paginated-data.dto';

@Injectable()
export class TransactionsService {
  private readonly logger: Logger = new Logger(TransactionsService.name);

  constructor(
    private readonly dbTransactionService: DbTransactionService,
    private readonly accountsService: AccountsService,
    private readonly categoriesService: CategoriesService,
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<Transaction>,
    private readonly i18n: I18nService,
  ) {}

  /**
   * Create a new transaction.
   * @param createTransactionDto The data to create the transaction.
   * @returns The transaction created.
   * @async
   */
  async create(
    createTransactionDto: CreateTransactionDto,
  ): Promise<TransactionDto> {
    const category = await this.categoriesService.findById(
      createTransactionDto.category,
      createTransactionDto.user,
    );

    if (!category) {
      throw new HttpException('Category not found', HttpStatus.NOT_FOUND);
    }

    const newTransaction = {
      ...createTransactionDto,
      amount:
        category.categoryType === CategoryType.EXPENSE
          ? -createTransactionDto.amount
          : createTransactionDto.amount,
    };

    try {
      return this.dbTransactionService.runTransaction(async (session) => {
        // create the transaction
        const transactionModel = new this.transactionModel(newTransaction);
        const savedTransaction = await transactionModel.save({ session });

        // add the transaction amount to the account balance
        await this.accountsService.addAccountBalance(
          savedTransaction.account.id,
          savedTransaction.amount,
          session,
        );

        return plainToClass(TransactionDto, savedTransaction.toObject());
      });
    } catch (error) {
      this.logger.error(
        `Failed to create transaction: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error creating the transaction',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Create a transfer transaction between two accounts.
   * @param createTransferDto The data to create the transfer transaction.
   * @returns The transfer transaction created.
   * @async
   */
  async createTransfer(createTransferDto: CreateTransferDto) {
    const originAccount = await this.accountsService.findById(
      createTransferDto.originAccount,
      createTransferDto.user,
    );

    if (!originAccount) {
      throw new HttpException('Origin account not found', HttpStatus.NOT_FOUND);
    }

    const newTransfer = {
      date: createTransferDto.date,
      description: `${this.i18n.t('transactions.transferFromDescription', {
        args: {
          from: originAccount.name,
        },
      })} (${createTransferDto.description})`,
      notes: createTransferDto.notes,
      account: createTransferDto.account,
      user: createTransferDto.user,
      amount: createTransferDto.amount,
    };

    try {
      return this.dbTransactionService.runTransaction(async (session) => {
        // create the income transaction for the destination account
        const incomeTransactionModel = new this.transactionModel(newTransfer);
        const savedIncomeTransaction = await incomeTransactionModel.save({
          session,
        });

        // add the income transaction amount to the destination account balance
        await this.accountsService.addAccountBalance(
          savedIncomeTransaction.account.id,
          savedIncomeTransaction.amount,
          session,
        );

        // create the outcome transaction for the origin account
        const outcomeTransaction = {
          date: createTransferDto.date,
          description: `${this.i18n.t('transactions.transferToDescription', {
            args: { to: savedIncomeTransaction.account.name },
          })} (${createTransferDto.description})`,
          notes: createTransferDto.notes,
          account: createTransferDto.originAccount,
          user: createTransferDto.user,
          amount: -createTransferDto.amount,
          transfer: savedIncomeTransaction.id,
          isTransfer: true,
        };
        const outcomeTransactionModel = new this.transactionModel(
          outcomeTransaction,
        );
        const savedOutcomeTransaction = await outcomeTransactionModel.save({
          session,
        });

        // add the outcome transaction amount to the origin account balance
        await this.accountsService.addAccountBalance(
          savedOutcomeTransaction.account.id,
          savedOutcomeTransaction.amount,
          session,
        );

        // update the transfer field of the income transaction
        savedIncomeTransaction.transfer = savedOutcomeTransaction.id;
        savedIncomeTransaction.isTransfer = true;
        await savedIncomeTransaction.save({ session });

        return plainToClass(TransactionDto, savedIncomeTransaction.toObject());
      });
    } catch (error) {
      this.logger.error(
        `Failed to create transfer transaction: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error creating the transfer transaction',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Find all transactions of a user with pagination.
   * @param userId The id of the user to find the transactions.
   * @param paginationDto The pagination parameters.
   * @returns The transactions found.
   * @async
   */
  async findAll(
    userId: string,
    paginationDto: PaginationDto,
  ): Promise<PaginatedDataDto<TransactionDto>> {
    const filter = { user: userId };
    const skip = paginationDto.offset || 0;
    const limit = paginationDto.limit || 10; // Default limit to 10 if not provided
    const sort = { createdAt: -1 }; // Sort by date descending

    try {
      const transactions = await this.transactionModel.find(filter, null, {
        skip,
        limit,
        sort,
      });
      const total = await this.transactionModel.countDocuments(filter);
      return {
        data: transactions.map((transaction) =>
          plainToClass(TransactionDto, transaction.toObject()),
        ),
        total,
        limit,
        offset: skip,
        nextPage: skip + limit < total ? skip + limit : null,
      };
    } catch (error) {
      this.logger.error(
        `Failed to find transactions for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error finding the transactions',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  //
  // /**
  //  * Find all transactions of an user. The filter can be by account, month and year.
  //  * @param query The query parameters to filter the transactions.
  //  * @param userId The id of the user to find the transactions.
  //  * @returns The transactions found.
  //  * @async
  //  */
  // async findAll(query: TransactionsQueryDto, userId: string) {
  //   if (!query.month || !query.year) {
  //     throw new HttpException(
  //       'Invalid query parameters',
  //       HttpStatus.BAD_REQUEST,
  //     );
  //   }
  //
  //   const dbQuery: Record<string, any> = { user: userId };
  //   if (query.accountId) {
  //     dbQuery['account'] = query.accountId;
  //   }
  //
  //   if (query.month && query.year) {
  //     const startOfMonth = new Date(query.year, query.month - 1, 1);
  //     const endOfMonth = new Date(query.year, query.month, 1);
  //     dbQuery['startDate'] = { $gte: startOfMonth, $lt: endOfMonth };
  //   }
  //
  //   try {
  //     const transactions = await this.transactionModel.find(dbQuery);
  //     return transactions.map((transaction) =>
  //       plainToClass(TransactionDto, transaction.toObject()),
  //     );
  //   } catch (error) {
  //     this.logger.error(
  //       `Failed to find transactions for user ${userId} with query ${JSON.stringify(query)}: ${error.message}`,
  //       error.stack,
  //     );
  //     throw new HttpException(
  //       'Error finding the transactions',
  //       HttpStatus.INTERNAL_SERVER_ERROR,
  //     );
  //   }
  // }
  //
  // /**
  //  * Find a transaction by id.
  //  * @param id The id of the transaction to find.
  //  * @param userId The id of the user to find the transaction.
  //  * @returns The transaction found.
  //  * @async
  //  */
  // async findOne(id: string, userId: string): Promise<TransactionDto> {
  //   try {
  //     const transaction = await this.transactionModel.findOne({
  //       _id: id,
  //       user: userId,
  //     });
  //     if (!transaction) {
  //       throw new HttpException('Transaction not found', HttpStatus.NOT_FOUND);
  //     }
  //     return plainToClass(TransactionDto, transaction.toObject());
  //   } catch (error) {
  //     this.logger.error(
  //       `Failed to find transaction: ${error.message}`,
  //       error.stack,
  //     );
  //     throw new HttpException(
  //       'Error finding the transaction',
  //       HttpStatus.INTERNAL_SERVER_ERROR,
  //     );
  //   }
  // }
  //
  // /**
  //  * Update a transaction by id.
  //  * @param id The id of the transaction to update.
  //  * @param updateTransactionDto The data to update the transaction.
  //  * @param userId The id of the user to update the transaction.
  //  * @returns The transaction updated.
  //  * @async
  //  */
  // async update(
  //   id: string,
  //   updateTransactionDto: UpdateTransactionDto,
  //   userId: string,
  // ): Promise<TransactionDto> {
  //   const oldTransaction = await this.findOne(id, userId);
  //
  //   const session = await this.connection.startSession();
  //   session.startTransaction();
  //   try {
  //     // update the transaction
  //     const updatedTransaction = await this.transactionModel.findOneAndUpdate(
  //       { _id: id, user: userId },
  //       {
  //         ...updateTransactionDto,
  //         amount:
  //           updateTransactionDto.transactionType === TransactionType.EXPENSE
  //             ? -updateTransactionDto.amount
  //             : updateTransactionDto.amount,
  //       },
  //       { new: true },
  //     );
  //
  //     // fix the account balance if the transaction was paid or the amount was changed
  //     if (updatedTransaction.paid != oldTransaction.paid) {
  //       const account = await this.accountsService.addAccountBalance(
  //         updatedTransaction.account.id,
  //         updatedTransaction.paid
  //           ? updatedTransaction.amount
  //           : -oldTransaction.amount,
  //       );
  //       updatedTransaction.account.balance = account.balance;
  //     } else if (
  //       updatedTransaction.paid &&
  //       updatedTransaction.amount !== oldTransaction.amount
  //     ) {
  //       const amountDiff = updatedTransaction.amount - oldTransaction.amount;
  //       const account = await this.accountsService.addAccountBalance(
  //         updatedTransaction.account.id,
  //         amountDiff,
  //       );
  //       updatedTransaction.account.balance = account.balance;
  //     }
  //
  //     await session.commitTransaction();
  //     return plainToClass(TransactionDto, updatedTransaction.toObject());
  //   } catch (error) {
  //     await session.abortTransaction();
  //     this.logger.error(
  //       `Failed to update transaction: ${error.message}`,
  //       error.stack,
  //     );
  //     throw new HttpException(
  //       'Error updating the transaction',
  //       HttpStatus.INTERNAL_SERVER_ERROR,
  //     );
  //   } finally {
  //     await session.endSession();
  //   }
  // }
  //
  // /**
  //  * Remove a transaction by id.
  //  * @param id The id of the transaction to remove.
  //  * @param userId The id of the user to remove the transaction.
  //  * @returns The transaction removed.
  //  * @async
  //  */
  // async remove(id: string, userId: string): Promise<TransactionDto> {
  //   const session = await this.connection.startSession();
  //   session.startTransaction();
  //   try {
  //     const transaction = await this.transactionModel.findOneAndDelete({
  //       _id: id,
  //       user: userId,
  //     });
  //     if (!transaction) {
  //       throw new HttpException('Transaction not found', HttpStatus.NOT_FOUND);
  //     }
  //
  //     // if is a paid transaction, remove the amount from the account balance
  //     if (transaction.paid) {
  //       const account = await this.accountsService.addAccountBalance(
  //         transaction.account.id,
  //         -transaction.amount,
  //       );
  //       transaction.account.balance = account.balance;
  //     }
  //     await session.commitTransaction();
  //     return plainToClass(TransactionDto, transaction.toObject());
  //   } catch (error) {
  //     await session.abortTransaction();
  //     if (error instanceof HttpException) {
  //       throw error;
  //     }
  //     this.logger.error(
  //       `Failed to remove transaction: ${error.message}`,
  //       error.stack,
  //     );
  //     throw new HttpException(
  //       'Error removing the transaction',
  //       HttpStatus.INTERNAL_SERVER_ERROR,
  //     );
  //   } finally {
  //     await session.endSession();
  //   }
  // }
}
