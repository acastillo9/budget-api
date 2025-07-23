import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Account } from './entities/account.entity';
import { ClientSession, Model } from 'mongoose';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { AccountDto } from './dto/account.dto';
import { plainToClass } from 'class-transformer';
import { DbTransactionService } from 'src/shared/db-transaction.service';
import { Transaction } from 'src/transactions/entities/transaction.entity';
import { ObjectId } from 'mongodb';

@Injectable()
export class AccountsService {
  private readonly logger: Logger = new Logger(AccountsService.name);

  constructor(
    @InjectModel(Account.name) private readonly accountModel: Model<Account>,
    private readonly dbTransactionService: DbTransactionService,
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<Transaction>,
  ) {}

  /**
   * Create a new account.
   * @param createAccountDto The data to create the account.
   * @param userId The id of the user to create the account.
   * @returns The account created.
   * @async
   */
  async create(
    createAccountDto: CreateAccountDto,
    userId: string,
  ): Promise<AccountDto> {
    const newAccount = {
      ...createAccountDto,
      user: userId,
    };
    try {
      const accountModel = new this.accountModel(newAccount);
      const savedAccount = await accountModel.save();
      return plainToClass(AccountDto, savedAccount.toObject());
    } catch (error) {
      this.logger.error(
        `Failed to create account: ${error.message}`,
        error.stack,
      );

      throw new HttpException(
        'Error creating the account',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Find all accounts of a user.
   * @param userId The id of the user to find the accounts.
   * @returns The accounts found.
   * @async
   */
  async findAll(userId: string): Promise<AccountDto[]> {
    try {
      const accounts = await this.accountModel.find({ user: userId });
      return accounts.map((account) =>
        plainToClass(AccountDto, account.toObject()),
      );
    } catch (error) {
      this.logger.error(
        `Failed to find accounts: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error finding the accounts',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Find an account by id.
   * @param id The id of the account to find.
   * @param userId The id of the user to find the account.
   * @returns The account found.
   * @async
   */
  async findById(id: string, userId: string): Promise<AccountDto> {
    try {
      const account = await this.accountModel.findOne({
        _id: id,
        user: userId,
      });
      if (!account) {
        throw new HttpException('Account not found', HttpStatus.NOT_FOUND);
      }
      return plainToClass(AccountDto, account.toObject());
    } catch (error) {
      this.logger.error(
        `Failed to find account: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error finding the account',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update an account.
   * @param id The id of the account to update.
   * @param updateAccountDto The data to update the account.
   * @param userId The id of the user to update the account.
   * @returns The account updated.
   * @async
   */
  async update(
    id: string,
    updateAccountDto: UpdateAccountDto,
    userId: string,
  ): Promise<AccountDto> {
    try {
      const updatedAccount = await this.accountModel.findOneAndUpdate(
        {
          _id: id,
          user: userId,
        },
        updateAccountDto,
        {
          new: true,
        },
      );
      if (!updatedAccount) {
        throw new HttpException('Account not found', HttpStatus.NOT_FOUND);
      }
      return plainToClass(AccountDto, updatedAccount.toObject());
    } catch (error) {
      this.logger.error(
        `Failed to update account: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error updating the account',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Remove an account.
   * @param id The id of the account to remove.
   * @param userId The id of the user to remove the account.
   * @returns The account removed.
   * @async
   */
  async remove(id: string, userId: string): Promise<AccountDto> {
    try {
      return this.dbTransactionService.runTransaction(async (session) => {
        const deletedAccount = await this.accountModel.findOneAndDelete(
          {
            _id: id,
            user: userId,
          },
          {
            session,
          },
        );
        if (!deletedAccount) {
          throw new HttpException('Account not found', HttpStatus.NOT_FOUND);
        }

        // delete all transactions related to the account
        await this.transactionModel.deleteMany({ account: id }, { session });

        return plainToClass(AccountDto, deletedAccount.toObject());
      });
    } catch (error) {
      this.logger.error(
        `Failed to remove account: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error removing the account',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Add balance to an account.
   * @param id The id of the account to add balance.
   * @param amount The amount to add to the account.
   * @param session The MongoDB session to use for the transaction.
   * @returns The account updated.
   * @async
   */
  async addAccountBalance(
    id: string,
    amount: number,
    session?: ClientSession,
  ): Promise<AccountDto> {
    try {
      const updatedAccount = await this.accountModel.findOneAndUpdate(
        { _id: id },
        { $inc: { balance: amount } },
        { new: true, session },
      );

      if (!updatedAccount) {
        throw new HttpException('Account not found', HttpStatus.NOT_FOUND);
      }

      return plainToClass(AccountDto, updatedAccount.toObject());
    } catch (error) {
      this.logger.error(
        `Failed to add balance to account: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error adding balance to the account',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get the total balance of all accounts for a user.
   * @param userId The id of the user to get the total balance.
   * @return The total balance of all accounts.
   * @async
   */
  async getSummary(userId: string): Promise<
    {
      currencyCode: string;
      totalBalance: number;
    }[]
  > {
    try {
      // query the account balance discriminated by currency code
      const accountsBalance = await this.accountModel.aggregate([
        { $match: { user: new ObjectId(userId) } },
        {
          $group: {
            _id: '$currencyCode',
            totalBalance: { $sum: '$balance' },
          },
        },
        {
          $project: {
            currencyCode: '$_id',
            totalBalance: 1,
            _id: 0,
          },
        },
      ]);
      console.log('Accounts Balance:', accountsBalance);
      return accountsBalance;
    } catch (error) {
      this.logger.error(
        `Failed to get total balance: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error getting the total balance',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
