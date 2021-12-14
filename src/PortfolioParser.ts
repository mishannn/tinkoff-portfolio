import CurrencyConverter from "./CurrencyConverter";
import InvestApi from "./InvestApi";
import { PortfolioReport, PortfolioReportPosition } from "./types";

const ACCOUNT_BALANCE_CURRENCY = "RUB";

export default class PortfolioParser {
  private _investApi: InvestApi;
  private _currencyConverter: CurrencyConverter;
  private _targetCurrency: string;

  constructor(
    investApi: InvestApi,
    currencyConverter: CurrencyConverter,
    targetCurrency: string
  ) {
    this._investApi = investApi;
    this._currencyConverter = currencyConverter;
    this._targetCurrency = targetCurrency;
  }

  private async getPositions(): Promise<PortfolioReportPosition[]> {
    const portfolio = await this._investApi.portfolio();

    return portfolio.positions.reduce((acc, position) => {
      const averagePositionPrice = position.averagePositionPrice;
      const expectedYield = position.expectedYield;

      if (averagePositionPrice === undefined || expectedYield === undefined) {
        return acc;
      }

      const positionName = position.name;
      const positionTicker = position.ticker;
      const positionBalance = position.balance;

      const positionAveragePrice = this._currencyConverter.convert(
        averagePositionPrice.value,
        averagePositionPrice.currency,
        this._targetCurrency
      );

      const positionYieldValue = this._currencyConverter.convert(
        expectedYield.value,
        expectedYield.currency,
        this._targetCurrency
      );

      const positionTotalPrice =
        positionBalance * positionAveragePrice + positionYieldValue;

      return [
        ...acc,
        {
          currency: this._targetCurrency,
          name: positionName,
          price: positionTotalPrice,
          ticker: positionTicker || "",
          yield: positionYieldValue,
        },
      ];
    }, [] as PortfolioReportPosition[]);
  }

  private async getAccountBalancePrice() {
    const portfolioCurrencies = await this._investApi.portfolioCurrencies();

    const accountBalanceCurrency = portfolioCurrencies.currencies.find(
      (currency) => currency.currency === ACCOUNT_BALANCE_CURRENCY
    );

    const accountBalancePrice = accountBalanceCurrency?.balance || 0;

    return this._currencyConverter.convert(
      accountBalancePrice,
      ACCOUNT_BALANCE_CURRENCY,
      this._targetCurrency
    );
  }

  async getPortfolioReport(): Promise<PortfolioReport> {
    console.log("Создание отчета...");

    await this._currencyConverter.loadCurrencies();

    const positions = await this.getPositions();
    positions.sort((a, b) => b.yield - a.yield);

    const accountBalancePrice = await this.getAccountBalancePrice();

    const statistic = {
      price: accountBalancePrice,
      yield: 0,
    };

    positions.forEach((position) => {
      statistic.price += position.price;
      statistic.yield += position.yield;
    });

    return {
      currency: this._targetCurrency,
      price: statistic.price,
      yield: statistic.yield,
      positions,
      accountBalance: {
        currency: this._targetCurrency,
        price: accountBalancePrice,
      },
    };
  }

  async testNormalTrading(): Promise<boolean> {
    const testInstrumentOrderbook = await this._investApi.orderbookGet({
      figi: "BBG000BPH459",
    });

    return testInstrumentOrderbook.tradeStatus === "NormalTrading";
  }
}
