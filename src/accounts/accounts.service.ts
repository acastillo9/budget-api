import { Injectable } from '@nestjs/common';
import { AccountDto } from './dto/account.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Account } from './entities/account.entity';
import { Model } from 'mongoose';
import { CreateAccountDto } from './dto/create-account.dto';

@Injectable()
export class AccountsService {
  constructor(
    @InjectModel(Account.name) private accountModel: Model<Account>,
  ) {}

  async create(createAccountDto: CreateAccountDto): Promise<AccountDto> {
    return new this.accountModel(createAccountDto)
      .save()
      .then(AccountDto.fromAccount);
  }

  async findOne(id: string): Promise<AccountDto> {
    return this.accountModel.findById(id).exec().then(AccountDto.fromAccount);
  }
}
