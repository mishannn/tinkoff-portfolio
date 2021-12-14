import { InstrumentType } from "@tinkoff/invest-openapi-js-sdk";

export interface PortfolioReportItem {
  currency: string;
  price: number;
  yield: number;
}

export interface PortfolioReportPosition extends PortfolioReportItem {
  name: string;
  ticker: string;
  type: InstrumentType;
}

export interface PortfolioReport extends PortfolioReportItem {
  positions: PortfolioReportPosition[];
  accountBalance: {
    currency: string;
    price: number;
  };
}
