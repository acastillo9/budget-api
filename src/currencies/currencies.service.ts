import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EXCHANGE_RATE_API_URL } from './constants';
import { CurrencyRates } from './types';
import { CurrencyCode } from 'src/shared/entities/currency-code.enum';

@Injectable()
export class CurrenciesService {
  private readonly logger: Logger = new Logger(CurrenciesService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Fetch the exchange rate for a given currency code.
   * @param currencyCode The currency code to fetch the exchange rate for.
   * @return A promise that resolves to an object containing the exchange rates.
   * @throws {Error} If the fetch operation fails or the response is not ok.
   * @async
   */
  async getExchangeRate(currencyCode: string): Promise<CurrencyRates> {
    try {
      const response = await fetch(
        `${this.configService.getOrThrow(EXCHANGE_RATE_API_URL)}/${currencyCode}`,
      );
      if (!response.ok) {
        throw new Error(
          `Error fetching exchange rates: ${response.statusText}`,
        );
      }
      const data = await response.json();
      const currencies = Object.keys(CurrencyCode);
      return Object.keys(data.conversion_rates).reduce((acc, key) => {
        if (currencies.includes(key)) {
          acc[key] = data.conversion_rates[key];
        }
        return acc;
      }, {});
    } catch (error) {
      this.logger.error(
        `Failed to fetch exchange rates for ${currencyCode}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Error fetching exchange rates: ${error.message}`);
    }
  }
}
