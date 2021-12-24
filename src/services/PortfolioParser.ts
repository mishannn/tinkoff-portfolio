import { PortfolioPosition } from "@tinkoff/invest-openapi-js-sdk";
import { getYieldPercents } from "../helpers/math";
import {
  ReportPosition,
  ReportAccountMoney,
  ReportSummary,
  Report,
} from "../types/report";
import CurrencyConverter from "./CurrencyConverter";
import InvestApi from "./InvestApi";

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

  /* ПОЗИЦИИ */

  private getPositionTicker(position: PortfolioPosition): string {
    const positionTicker = position.ticker ?? "";

    if (position.instrumentType !== "Currency") {
      return positionTicker;
    }

    const currencyTicker =
      this._currencyConverter.getTickerByIsin(positionTicker);

    if (!currencyTicker) {
      return positionTicker;
    }

    return currencyTicker;
  }

  private createReportPosition(
    portfolioPosition: PortfolioPosition
  ): ReportPosition | undefined {
    const positionPrice = portfolioPosition.averagePositionPrice;
    const positionYield = portfolioPosition.expectedYield;

    if (positionPrice === undefined || positionYield === undefined) {
      return undefined;
    }

    const positionTicker = this.getPositionTicker(portfolioPosition);

    const currentCostValue =
      portfolioPosition.balance * positionPrice.value + positionYield.value;

    const currentPriceValue = currentCostValue / portfolioPosition.balance;

    return {
      name: portfolioPosition.name,
      ticker: positionTicker,
      type: portfolioPosition.instrumentType,
      balance: portfolioPosition.balance,
      price: currentPriceValue,
      cost: currentCostValue,
      yield: positionYield.value,
      currency: positionPrice.currency,
    };
  }

  private async createReportPositions(): Promise<ReportPosition[]> {
    const portfolio = await this._investApi.portfolio();

    const positions = portfolio.positions.reduce((acc, position) => {
      const reportPosition = this.createReportPosition(position);

      if (!reportPosition) {
        return acc;
      }

      return [...acc, reportPosition];
    }, [] as ReportPosition[]);

    positions.sort(
      (a, b) =>
        getYieldPercents(b.cost, b.yield) - getYieldPercents(a.cost, a.yield)
    );

    return positions;
  }

  /* БАЛАНС АККАУНТА */

  private async getAccountMoneyBalance() {
    const portfolioCurrencies = await this._investApi.portfolioCurrencies();

    const accountMoney = portfolioCurrencies.currencies.find(
      (currency) => currency.currency === ACCOUNT_BALANCE_CURRENCY
    );

    const accountMoneyBalance = accountMoney?.balance || 0;

    return this._currencyConverter.convert(
      accountMoneyBalance,
      ACCOUNT_BALANCE_CURRENCY,
      this._targetCurrency
    );
  }

  private async createReportAccountMoney(): Promise<ReportAccountMoney> {
    const balance = await this.getAccountMoneyBalance();

    return {
      balance,
      currency: this._targetCurrency,
    };
  }

  /* СТАТИСТИКА */

  private createReportSummary(
    positions: ReportPosition[],
    accountMoney: ReportAccountMoney
  ): ReportSummary {
    const result: ReportSummary = {
      cost: accountMoney.balance,
      yield: 0,
      currency: this._targetCurrency,
    };

    positions.forEach((position) => {
      result.cost += this._currencyConverter.convert(
        position.cost,
        position.currency,
        this._targetCurrency
      );

      result.yield += this._currencyConverter.convert(
        position.yield,
        position.currency,
        this._targetCurrency
      );
    });

    return result;
  }

  /* СОЗДАНИЕ ОТЧЕТА */

  async createPortfolioReport(): Promise<Report> {
    console.log("Создание отчета...");

    // Обновление курса валют перед созданием отчета
    await this._currencyConverter.loadCurrencies();

    const positions = await this.createReportPositions();
    const accountMoney = await this.createReportAccountMoney();
    const summary = this.createReportSummary(positions, accountMoney);

    return {
      positions,
      accountMoney,
      summary,
    };
  }

  /* ПРОВЕРКА РАБОТЫ БИРЖИ */

  async testNormalTrading(): Promise<boolean> {
    const testInstrumentOrderbook = await this._investApi.orderbookGet({
      figi: "BBG000BPH459",
    });

    return testInstrumentOrderbook.tradeStatus === "NormalTrading";
  }
}
