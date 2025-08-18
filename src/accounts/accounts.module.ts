import { Module } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Account, AccountSchema } from './entities/account.entity';
import { AccountsController } from './accounts.controller';
import { UsersModule } from 'src/users/users.module';
import { SharedModule } from 'src/shared/shared.module';
import {
  Transaction,
  TransactionSchema,
} from 'src/transactions/entities/transaction.entity';
import {
  AccountType,
  AccountTypeSchema,
} from '../account-types/entities/account-type.entity';
import { AccountTypesModule } from 'src/account-types/account-types.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Account.name, schema: AccountSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: AccountType.name, schema: AccountTypeSchema },
    ]),
    UsersModule,
    SharedModule,
    AccountTypesModule,
  ],
  providers: [AccountsService],
  exports: [AccountsService],
  controllers: [AccountsController],
})
export class AccountsModule {}
