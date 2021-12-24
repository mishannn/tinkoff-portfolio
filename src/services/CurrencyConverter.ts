import axios from "axios";

interface ConvertCurrencyRate {
  srcCurrency: string;
  dstCurrency: string;
  isin: string;
  ticker: string;
  value: number;
}

export default class CurrencyConverter {
  private _currencies: ConvertCurrencyRate[] = [];

  async loadCurrencies(): Promise<void> {
    console.log("Загрузка курсов валют...");

    const response = await axios.post(
      "https://api.tinkoff.ru/trading/currency/list",
      {
        pageSize: 50,
        currentPage: 0,
        start: 0,
        end: 50,
        sortType: "ByBuyBackDate",
        orderType: "Asc",
        country: "All",
      }
    );

    const data = response.data;

    if (!data) {
      throw new Error("Сервер отправил пустой ответ на запрос списка валют");
    }

    const payload = data.payload;

    if (!payload) {
      throw new Error("Сервер не отправил данные на запрос списка валют");
    }

    if (data.status !== "Ok") {
      throw new Error(payload.message);
    }

    const values = payload.values;

    if (!Array.isArray(values)) {
      throw new Error("Сервер не отправил список валют");
    }

    this._currencies = values.reduce((acc, value) => {
      const ticker: string = value?.symbol?.ticker ?? "";
      const isin: string = value?.symbol?.isin ?? "";
      const price: number = value?.prices?.last?.value ?? 0;

      if (!ticker || ticker.length !== 6 || !isin || !price) {
        return acc;
      }

      const srcCurrency = ticker.slice(0, 3);
      const dstCurrency = ticker.slice(3, 6);

      const result: ConvertCurrencyRate = {
        srcCurrency,
        dstCurrency,
        ticker,
        isin,
        value: price,
      };

      return [...acc, result];
    }, []);
  }

  convert(value: number, srcCurrency: string, dstCurrency: string): number {
    if (srcCurrency === dstCurrency) {
      return value;
    }

    const rate = this.getCurrencyRate(srcCurrency, dstCurrency);

    if (rate === undefined) {
      throw new Error("Не найден курс для конвертации валют");
    }

    return value * rate;
  }

  private getCurrencyRate(
    srcCurrency: string,
    dstCurrency: string
  ): number | undefined {
    const foundCurrency = this._currencies.find((currency) => {
      return (
        currency.srcCurrency === srcCurrency &&
        currency.dstCurrency === dstCurrency
      );
    });

    if (foundCurrency) {
      return foundCurrency.value;
    }

    const foundReverseCurrency = this._currencies.find((currency) => {
      return (
        currency.srcCurrency === dstCurrency &&
        currency.dstCurrency === srcCurrency
      );
    });

    if (foundReverseCurrency) {
      return 1 / foundReverseCurrency.value;
    }

    return undefined;
  }

  getTickerByIsin(isin: string): string {
    const foundCurrency = this._currencies.find(
      (currency) => currency.isin === isin
    );

    if (!foundCurrency) {
      return "";
    }

    return foundCurrency.ticker;
  }
}
