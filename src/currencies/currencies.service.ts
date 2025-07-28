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

    const currencyCodeLower = currencyCode.toLowerCase();
    try {
      const { data: latestData } = await firstValueFrom(
        this.httpService.get(
          this.configService
            .getOrThrow(EXCHANGE_RATE_API_URL)
            .replace('{date}', 'latest')
            .replace('{currencyCode}', currencyCodeLower),
        ),
      );

      // previous day data for compare with latest and calculate if the rate is up or down
      // yesterday date is the previous day date in format YYYY-MM-DD
      const yesterday = ((d) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)(
        new Date(Date.now() - 86400000),
      );

      const { data: previousDayData } = await firstValueFrom(
        this.httpService.get(
          this.configService
            .getOrThrow(EXCHANGE_RATE_API_URL)
            .replace('{date}', yesterday)
            .replace('{currencyCode}', currencyCodeLower),
        ),
      );

      const currencyRates = this.getRatesFromResponse(
        currencyCode,
        latestData,
        previousDayData,
      );

      // Cache the rates
      const now = new Date();
      // Create a new date object for the target time (today at 4:00:00 UTC)
      const next4AM = new Date();
      next4AM.setUTCHours(4, 0, 0, 0);
      // If 4 AM UTC has already passed for today, set it to 4 AM UTC tomorrow
      if (now.getTime() >= next4AM.getTime()) {
        next4AM.setUTCDate(next4AM.getUTCDate() + 1);
      }
      // Calculate the difference in milliseconds
      const ttl = next4AM.getTime() - now.getTime();

      this.logger.debug(
        `Caching exchange rates for ${currencyCode} with TTL: ${ttl}ms`,
      );

      await this.cacheManager.set(
        `exchange_rates_${currencyCode}`,
        currencyRates,
        ttl,
      );

      return currencyRates;
    } catch (error) {
      this.logger.error(
        `Failed to fetch exchange rates for ${currencyCode}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Error fetching exchange rates: ${error.message}`);
    }
  }

  /**
   * Extracts the exchange rates from the API response.
   * @param data The API response data containing conversion rates.
   * @return An object containing the exchange rates for supported currencies.
   * @private
   */
  private getRatesFromResponse(currencyCode: string, data, previousDayData) {
    const currencyCodeLower = currencyCode.toLowerCase();
    const currencies = Object.keys(CurrencyCode);
    const rates = Object.keys(data[currencyCodeLower]).reduce((acc, key) => {
      const keyUpper = key.toUpperCase();
      if (currencies.includes(keyUpper)) {
        acc[keyUpper] = {
          rate: data[currencyCodeLower][key],
          isUp:
            data[currencyCodeLower][key] >
            previousDayData[currencyCodeLower][key],
        };
      }
      return acc;
    }, {});
    return {
      baseCurrencyCode: currencyCode,
      updatedAt: new Date(data.date),
      rates,
    };
  }
}
