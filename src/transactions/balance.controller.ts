import { Controller, Get, Param } from '@nestjs/common';
import { TransactionsService } from './transactions.service';

@Controller('balance')
export class BalanceController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  getBalance() {
    return this.transactionsService.getBalance();
  }

  @Get('projected/:date')
  getProjectedBalance(@Param('date') date: string) {
    return this.transactionsService.getBalanceByDate(date);
  }
}
