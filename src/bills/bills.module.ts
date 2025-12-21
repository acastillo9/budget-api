import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AccountsModule } from 'src/accounts/accounts.module';
import { Bill, BillSchema } from './entities/bill.entity';
import { UsersModule } from 'src/users/users.module';
import { BillsController } from './bills.controller';
import { BillsService } from './bills.service';
import { SharedModule } from 'src/shared/shared.module';
import { CategoriesModule } from 'src/categories/categories.module';
import { TransactionsModule } from 'src/transactions/transactions.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Bill.name, schema: BillSchema }]),
    AccountsModule,
    UsersModule,
    SharedModule,
    CategoriesModule,
    TransactionsModule,
  ],
  controllers: [BillsController],
  providers: [BillsService],
})
export class BillsModule {}
