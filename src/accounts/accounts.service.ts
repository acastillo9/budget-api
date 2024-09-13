import { Injectable } from '@nestjs/common';
import { AccountResponseDto } from './dto/account-response.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Account } from './entities/account.entity';
import { Model } from 'mongoose';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@Injectable()
export class AccountsService {
  constructor(
    @InjectModel(Account.name) private accountModel: Model<Account>,
  ) {}

  async create(
    createAccountDto: CreateAccountDto,
  ): Promise<AccountResponseDto> {
    const newAccount = await new this.accountModel(createAccountDto).save();
    return AccountResponseDto.fromAccount(newAccount);
  }

  async findAll(userId: string): Promise<AccountResponseDto[]> {
    const accounts = await this.accountModel.find({ user: userId });
    return accounts.map(AccountResponseDto.fromAccount);
  }

  async findOne(id: string, userId: string): Promise<AccountResponseDto> {
    const account = await this.accountModel.findOne({ _id: id, user: userId });
    return AccountResponseDto.fromAccount(account);
  }

  async update(
    id: string,
    updateAccountDto: UpdateAccountDto,
    userId: string,
  ): Promise<AccountResponseDto> {
    const updatedAccount = await this.accountModel.findOneAndUpdate(
      { _id: id, user: userId },
      updateAccountDto,
      { new: true },
    );
    return AccountResponseDto.fromAccount(updatedAccount);
  }

  async remove(id: string, userId: string): Promise<AccountResponseDto> {
    const deletedAccount = await this.accountModel.findOneAndDelete({
      _id: id,
      user: userId,
    });
    return AccountResponseDto.fromAccount(deletedAccount);
  }

  async addAccountBalance(
    id: string,
    amount: number,
  ): Promise<AccountResponseDto> {
    return this.accountModel
      .findByIdAndUpdate(
        id,
        {
          $inc: { balance: amount },
        },
        { new: true },
      )
      .exec()
      .then(AccountResponseDto.fromAccount);
  }
}
