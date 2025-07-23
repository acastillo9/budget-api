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

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Account.name, schema: AccountSchema },
      { name: Transaction.name, schema: TransactionSchema },
    ]),
    UsersModule,
    SharedModule,
  ],
  providers: [AccountsService],
  exports: [AccountsService],
  controllers: [AccountsController],
})
export class AccountsModule {}
