import { Injectable } from '@nestjs/common';
import { AccountResponseDto } from './dto/account-response.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Account } from './entities/account.entity';
import { Model } from 'mongoose';
import { CreateAccountDto } from './dto/create-account.dto';

@Injectable()
export class AccountsService {
  constructor(
    @InjectModel(Account.name) private accountModel: Model<Account>,
  ) {}

  async create(
    createAccountDto: CreateAccountDto,
  ): Promise<AccountResponseDto> {
    return new this.accountModel(createAccountDto)
      .save()
      .then(AccountResponseDto.fromAccount);
  }

  async findOne(id: string): Promise<AccountResponseDto> {
    return this.accountModel
      .findById(id)
      .exec()
      .then(AccountResponseDto.fromAccount);
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
