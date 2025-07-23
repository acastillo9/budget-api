import { Controller, Get, Param } from '@nestjs/common';
import { CurrenciesService } from './currencies.service';
import { CurrencyRates } from './types';

@Controller('currencies')
export class CurrenciesController {
  constructor(private readonly currenciesService: CurrenciesService) {}

  @Get(':currencyCode')
  async getExchangeRate(
    @Param('currencyCode') currencyCode: string,
  ): Promise<CurrencyRates> {
    return this.currenciesService.getExchangeRate(currencyCode);
  }
}
