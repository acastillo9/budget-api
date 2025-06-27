import { Module } from '@nestjs/common';
import { DbTransactionService } from './db-transaction.service';

@Module({
  providers: [DbTransactionService],
  exports: [DbTransactionService],
})
export class SharedModule {}
