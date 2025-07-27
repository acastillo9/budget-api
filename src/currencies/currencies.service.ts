import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EXCHANGE_RATE_API_URL } from './constants';
import { CurrencyRates } from './types';
import { CurrencyCode } from 'src/shared/entities/currency-code.enum';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class CurrenciesService {
  private readonly logger: Logger = new Logger(CurrenciesService.name);

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Fetch the exchange rate for a given currency code.
   * @param currencyCode The currency code to fetch the exchange rate for.
   * @return A promise that resolves to an object containing the exchange rates.
   * @throws {Error} If the fetch operation fails or the response is not ok.
   * @async
   */
  async getExchangeRate(currencyCode: string): Promise<CurrencyRates> {
    const cacheData = await this.cacheManager.get<CurrencyRates>(
      `exchange_rates_${currencyCode}`,
    );

    if (cacheData) {
      this.logger.debug(`Returning cached exchange rates for ${currencyCode}`);
      return cacheData;
    }

    try {
      const { data } = await firstValueFrom(
        this.httpService.get(
          `${this.configService.getOrThrow(EXCHANGE_RATE_API_URL)}/${currencyCode}`,
        ),
      );
      const currencies = Object.keys(CurrencyCode);
      const rates = Object.keys(data.conversion_rates).reduce((acc, key) => {
        if (currencies.includes(key)) {
          acc[key] = data.conversion_rates[key];
        }
        return acc;
      }, {});

      // Cache the rates
      const now = new Date().getTime();
      const nextUpdateTime = data.time_next_update_unix * 1000;
      const ttl = nextUpdateTime - now;

      this.logger.debug(
        `Caching exchange rates for ${currencyCode} with TTL: ${ttl}ms`,
      );

      if (ttl > 0) {
        await this.cacheManager.set(
          `exchange_rates_${currencyCode}`,
          rates,
          ttl,
        );
      }

      return rates;
    } catch (error) {
      this.logger.error(
        `Failed to fetch exchange rates for ${currencyCode}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Error fetching exchange rates: ${error.message}`);
    }
  }
}
