import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Transaction } from './entities/transaction.entity';
import { ClientSession, Model } from 'mongoose';
import { AccountsService } from 'src/accounts/accounts.service';
import { TransactionDto } from './dto/transaction.dto';
import { plainToClass } from 'class-transformer';
import { DbTransactionService } from 'src/shared/db-transaction.service';
import { CategoriesService } from 'src/categories/categories.service';
import { CategoryType } from 'src/categories/entities/category-type.enum';
import { I18nService } from 'nestjs-i18n';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { PaginationDto } from 'src/shared/dto/pagination.dto';
import { PaginatedDataDto } from 'src/shared/dto/paginated-data.dto';
import { UpdateTransferDto } from './dto/update-transfer.dto';
import { ObjectId } from 'mongodb';

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
   * @param userId The id of the user to create the transaction.
   * @returns The transaction created.
   * @async
   */
  async create(
    createTransactionDto: CreateTransactionDto,
    userId: string,
    session?: ClientSession,
  ): Promise<TransactionDto> {
    const category = await this.categoriesService.findById(
      createTransactionDto.category,
      userId,
    );

    const newTransaction = {
      ...createTransactionDto,
      amount:
        category.categoryType === CategoryType.EXPENSE
          ? -createTransactionDto.amount
          : createTransactionDto.amount,
      user: userId,
    };

    const saveTransactionFn = async (session: ClientSession) => {
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
    };

    try {
      return session
        ? saveTransactionFn(session)
        : this.dbTransactionService.runTransaction(saveTransactionFn);
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
   * @param userId The id of the user to create the transfer transaction.
   * @returns The transfer transaction created.
   * @async
   */
  async createTransfer(createTransferDto: CreateTransferDto, userId: string) {
    const originAccount = await this.accountsService.findById(
      createTransferDto.originAccount,
      userId,
    );

    if (!originAccount) {
      throw new HttpException('Origin account not found', HttpStatus.NOT_FOUND);
    }

    const newTransfer = {
      date: createTransferDto.date,
      description: createTransferDto.description,
      notes: createTransferDto.notes,
      account: createTransferDto.account,
      user: userId,
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
          description: createTransferDto.description,
          notes: createTransferDto.notes,
          account: createTransferDto.originAccount,
          user: userId,
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

  /**
   * update a transaction by id.
   * @param id The id of the transaction to update.
   * @param updateTransactionDto The data to update the transaction.
   * @param userId The id of the user to update the transaction.
   * @param session Optional mongoose client session to use for transaction.
   * @return The transaction updated.
   * @async
   */
  async update(
    id: string,
    updateTransactionDto: UpdateTransactionDto,
    userId: string,
    session?: ClientSession,
  ): Promise<TransactionDto> {
    const oldTransaction = await this.findOne(id, userId);

    const dataToUpdate: UpdateTransactionDto = {
      ...updateTransactionDto,
    };

    // if the category is changed, we need to find the new category
    if (
      updateTransactionDto.category &&
      updateTransactionDto.category !== oldTransaction.category.id
    ) {
      const category = await this.categoriesService.findById(
        updateTransactionDto.category,
        userId,
      );

      dataToUpdate.category = category.id;
      // if the updateTrabsactionDto.amount is defined we need to update the amount
      if (
        updateTransactionDto.amount !== undefined &&
        updateTransactionDto.amount !== oldTransaction.amount
      ) {
        dataToUpdate.amount =
          category.categoryType === CategoryType.EXPENSE
            ? -updateTransactionDto.amount
            : updateTransactionDto.amount;
      } else {
        // if the amount is not defined, we need to keep the old amount but
        // change the sign if the category type is changed
        dataToUpdate.amount = -oldTransaction.amount;
      }
    } else if (
      updateTransactionDto.amount !== undefined &&
      updateTransactionDto.amount !== oldTransaction.amount
    ) {
      // if the category is not changed but the amount is defined, we need to update the amount
      dataToUpdate.amount =
        oldTransaction.category.categoryType === CategoryType.EXPENSE
          ? -updateTransactionDto.amount
          : updateTransactionDto.amount;
    }

    const updateFn = async (session: ClientSession) => {
      // if the account was changed, remove the old transaction amount from the old account balance
      if (
        updateTransactionDto.account &&
        updateTransactionDto.account !== oldTransaction.account.id
      ) {
        await this.accountsService.addAccountBalance(
          oldTransaction.account.id,
          -oldTransaction.amount,
          session,
        );

        if (dataToUpdate.amount !== undefined) {
          // add the new transaction amount to the new account balance
          await this.accountsService.addAccountBalance(
            updateTransactionDto.account,
            dataToUpdate.amount,
            session,
          );
        } else {
          // add the old transaction amount to the new account balance
          await this.accountsService.addAccountBalance(
            updateTransactionDto.account,
            oldTransaction.amount,
            session,
          );
        }
      } else if (dataToUpdate.amount !== undefined) {
        // calculate the amount difference to update the account balance
        const amountDiff = dataToUpdate.amount - oldTransaction.amount;
        if (amountDiff !== 0) {
          // add the amount diff to the account balance
          await this.accountsService.addAccountBalance(
            oldTransaction.account.id,
            amountDiff,
            session,
          );
        }
      }

      const updatedTransaction = await this.transactionModel.findOneAndUpdate(
        { _id: id, user: userId },
        dataToUpdate,
        { new: true, session },
      );

      return plainToClass(TransactionDto, updatedTransaction.toObject());
    };
    return session
      ? updateFn(session)
      : this.dbTransactionService.runTransaction(updateFn);
  }

  /**
   * Update a transfer transaction by id.
   * @param id The id of the transfer transaction to update.
   * @param updateTransferDto The data to update the transfer transaction.
   * @param userId The id of the user to update the transfer transaction.
   * @return The transfer transaction updated.
   * @async
   */
  async updateTransfer(
    id: string,
    updateTransferDto: UpdateTransferDto,
    userId: string,
  ): Promise<TransactionDto> {
    const transactionToUpdate = await this.findOne(id, userId);
    if (!transactionToUpdate.isTransfer) {
      throw new HttpException(
        'Transaction is not a transfer',
        HttpStatus.BAD_REQUEST,
      );
    }

    const siblingTransaction = transactionToUpdate.transfer;

    const originTransaction =
      transactionToUpdate.amount < 0 ? transactionToUpdate : siblingTransaction;
    const targetTransaction =
      transactionToUpdate.amount > 0 ? transactionToUpdate : siblingTransaction;

    const originTransactionPayload: UpdateTransactionDto = {};
    const targetTransactionPayload: UpdateTransactionDto = {};

    // Handle amount update
    const isAmountUpdate =
      updateTransferDto.amount !== undefined &&
      updateTransferDto.amount !== Math.abs(originTransaction.amount);

    if (isAmountUpdate) {
      originTransactionPayload.amount = -updateTransferDto.amount;
      targetTransactionPayload.amount = updateTransferDto.amount;
    }

    // Handle origin account change
    if (
      updateTransferDto.originAccount &&
      updateTransferDto.originAccount !== originTransaction.account.id
    ) {
      // throw an error if the new origin and target accounts are the same
      if (
        updateTransferDto.originAccount ===
        (updateTransferDto.account || targetTransaction.account.id)
      ) {
        throw new HttpException(
          'Origin and target accounts cannot be the same.',
          HttpStatus.BAD_REQUEST,
        );
      }
      const account = await this.accountsService.findById(
        updateTransferDto.originAccount,
        userId,
      ); // Validate account exists
      originTransactionPayload.account = account.id;
    }

    // Handle target account change
    if (
      updateTransferDto.account &&
      updateTransferDto.account !== targetTransaction.account.id
    ) {
      if (
        updateTransferDto.account ===
        (updateTransferDto.originAccount || originTransaction.account.id)
      ) {
        throw new HttpException(
          'Origin and target accounts cannot be the same.',
          HttpStatus.BAD_REQUEST,
        );
      }
      const account = await this.accountsService.findById(
        updateTransferDto.account,
        userId,
      ); // Validate account exists
      targetTransactionPayload.account = account.id;
    }

    if (updateTransferDto.date) {
      originTransactionPayload.date = updateTransferDto.date;
      targetTransactionPayload.date = updateTransferDto.date;
    }

    if (updateTransferDto.description) {
      originTransactionPayload.description = updateTransferDto.description;
      targetTransactionPayload.description = updateTransferDto.description;
    }

    if (updateTransferDto.notes) {
      originTransactionPayload.notes = updateTransferDto.notes;
      targetTransactionPayload.notes = updateTransferDto.notes;
    }

    return this.dbTransactionService.runTransaction(async (session) => {
      if (originTransactionPayload.account) {
        // If origin account is changed, remove the old transaction amount from the old account balance
        await this.accountsService.addAccountBalance(
          originTransaction.account.id,
          -originTransaction.amount,
          session,
        );

        // Add the new transaction amount to the new account balance
        await this.accountsService.addAccountBalance(
          originTransactionPayload.account,
          originTransactionPayload.amount || originTransaction.amount,
          session,
        );

        if (targetTransactionPayload.account) {
          // If target account is changed, remove the old transaction amount from the old account balance
          await this.accountsService.addAccountBalance(
            targetTransaction.account.id,
            -targetTransaction.amount,
            session,
          );

          // Add the new transaction amount to the new account balance
          await this.accountsService.addAccountBalance(
            targetTransactionPayload.account,
            targetTransactionPayload.amount || targetTransaction.amount,
            session,
          );
        } else if (targetTransactionPayload.amount !== undefined) {
          // If only origin account is changed and the amount changes change it on the target account
          const amountDiff =
            targetTransactionPayload.amount - targetTransaction.amount;
          await this.accountsService.addAccountBalance(
            targetTransaction.account.id,
            amountDiff,
            session,
          );
        }
      } else if (targetTransactionPayload.account) {
        // If only target account is changed, remove the old transaction amount from the old account balance
        await this.accountsService.addAccountBalance(
          targetTransaction.account.id,
          -targetTransaction.amount,
          session,
        );

        // Add the new transaction amount to the new account balance
        await this.accountsService.addAccountBalance(
          targetTransactionPayload.account,
          targetTransactionPayload.amount || targetTransaction.amount,
          session,
        );

        if (originTransactionPayload.amount !== undefined) {
          // If only target account is changed and the amount changes change it on the origin account
          const amountDiff =
            originTransactionPayload.amount - originTransaction.amount;
          await this.accountsService.addAccountBalance(
            originTransaction.account.id,
            amountDiff,
            session,
          );
        }
      } else if (isAmountUpdate) {
        // If only the amount is changed, calculate the amount difference to update the account balance
        const originAmountDiff =
          originTransactionPayload.amount - originTransaction.amount;
        const targetAmountDiff =
          targetTransactionPayload.amount - targetTransaction.amount;

        await this.accountsService.addAccountBalance(
          originTransaction.account.id,
          originAmountDiff,
          session,
        );

        await this.accountsService.addAccountBalance(
          targetTransaction.account.id,
          targetAmountDiff,
          session,
        );
      }

      // Update the origin transaction
      const updatedOriginTransaction =
        await this.transactionModel.findOneAndUpdate(
          { _id: originTransaction.id, user: userId },
          originTransactionPayload,
          { new: true, session },
        );

      // Update the target transaction
      const updatedTargetTransaction =
        await this.transactionModel.findOneAndUpdate(
          { _id: targetTransaction.id, user: userId },
          targetTransactionPayload,
          { new: true, session },
        );

      return plainToClass(
        TransactionDto,
        (updatedOriginTransaction.id === transactionToUpdate.id
          ? updatedOriginTransaction
          : updatedTargetTransaction
        ).toObject(),
      );
    });
  }

  /**
   * Remove a transaction by id.
   * @param id The id of the transaction to remove.
   * @param userId The id of the user to remove the transaction.
   * @returns The transaction removed.
   * @async
   */
  async remove(
    id: string,
    userId: string,
    session?: ClientSession,
  ): Promise<TransactionDto> {
    const transaction = await this.findOne(id, userId);
    const removeFn = async (session: ClientSession) => {
      // Remove the transaction amount from the account balance
      await this.accountsService.addAccountBalance(
        transaction.account.id,
        -transaction.amount,
        session,
      );
      // Delete the transaction
      const deletedTransaction = await this.transactionModel.findOneAndDelete(
        { _id: id, user: userId },
        { session },
      );
      if (!deletedTransaction) {
        throw new HttpException('Transaction not found', HttpStatus.NOT_FOUND);
      }
      return plainToClass(TransactionDto, deletedTransaction.toObject());
    };

    return session
      ? removeFn(session)
      : this.dbTransactionService.runTransaction(removeFn);
  }

  /**
   * Remove a transfer transaction by id.
   * @param id The id of the transfer transaction to remove.
   * @param userId The id of the user to remove the transfer transaction.
   * @returns The transfer transaction removed.
   * @async
   */
  async removeTransfer(id: string, userId: string): Promise<TransactionDto> {
    const transaction = await this.findOne(id, userId);
    if (!transaction.isTransfer) {
      throw new HttpException(
        'Transaction is not a transfer',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.dbTransactionService.runTransaction(async (session) => {
      // Remove the transfer amount from both accounts involved in the transfer
      await this.accountsService.addAccountBalance(
        transaction.account.id,
        -transaction.amount,
        session,
      );
      await this.accountsService.addAccountBalance(
        transaction.transfer.account.id,
        -transaction.transfer.amount,
        session,
      );
      // Delete both transactions
      const deletedTransaction = await this.transactionModel.findOneAndDelete(
        { _id: id, user: userId },
        { session },
      );
      const deletedTransfer = await this.transactionModel.findOneAndDelete(
        { _id: transaction.transfer.id, user: userId },
        { session },
      );
      if (!deletedTransaction || !deletedTransfer) {
        throw new HttpException(
          'Transfer transaction not found',
          HttpStatus.NOT_FOUND,
        );
      }
      return plainToClass(TransactionDto, deletedTransaction.toObject());
    });
  }

  /**
   * Get the summary of transactions for a user.
   * It includes the month total income and month total expenses.
   * @param userId The id of the user to get the summary.
   * @return The summary of transactions.
   * @async
   */
  async getSummary(userId: string): Promise<
    {
      currencyCode: string;
      totalIncome: number;
      totalExpenses: number;
    }[]
  > {
    // Get the start and end of the current month
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed (e.g., 6 for July)

    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 1);
    try {
      const transactions = await this.transactionModel.aggregate([
        // Stage 1: Filter documents for the current month 🗓️
        {
          $match: {
            user: new ObjectId(userId),
            date: {
              $gte: startDate,
              $lt: endDate,
            },
            isTransfer: false,
          },
        },
        // Stage 2: Join with the 'accounts' collection to get currencyCode 🔗
        {
          $lookup: {
            from: 'accounts', // The name of your accounts collection
            localField: 'account', // Field in 'transactions' with the account ObjectId
            foreignField: '_id', // Primary key in the 'accounts' collection
            as: 'accountDetails',
          },
        },
        // Stage 3: Deconstruct the accountDetails array to access its fields
        {
          $unwind: '$accountDetails',
        },
        // Stage 4: Group by currency code and calculate sums 💰
        {
          $group: {
            _id: '$accountDetails.currencyCode', // Group by the currency code
            totalIncome: {
              $sum: { $cond: [{ $gt: ['$amount', 0] }, '$amount', 0] },
            },
            totalExpenses: {
              $sum: { $cond: [{ $lt: ['$amount', 0] }, '$amount', 0] },
            },
          },
        },
        // Stage 5: Format the final output document ✨
        {
          $project: {
            _id: 0,
            year: year,
            month: month + 1, // Convert to 1-indexed month (e.g., 7 for July)
            currencyCode: '$_id',
            totalIncome: '$totalIncome',
            totalExpenses: { $abs: '$totalExpenses' },
          },
        },
        // Stage 6: Sort by currency code for consistent ordering
        {
          $sort: {
            currencyCode: 1,
          },
        },
      ]);
      return transactions;
    } catch (error) {
      this.logger.error(
        `Failed to get summary for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error getting the summary',
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
  private async findOne(id: string, userId: string): Promise<TransactionDto> {
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
}
