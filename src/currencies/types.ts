export type CurrencyRates = {
  baseCurrencyCode: string;
  updatedAt: Date;
  rates: {
    [currencyCode: string]: {
      rate: number;
      isUp: boolean;
    };
  };
};
