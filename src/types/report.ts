import { InstrumentType } from "@tinkoff/invest-openapi-js-sdk";

export interface ReportPosition {
  name: string;
  ticker: string;
  type: InstrumentType;
  balance: number;
  price: number;
  cost: number;
  yield: number;
  currency: string;
}

export interface ReportAccountMoney {
  balance: number;
  currency: string;
}

export interface ReportSummary {
  cost: number;
  yield: number;
  currency: string;
}

export interface Report {
  positions: ReportPosition[];
  accountMoney: ReportAccountMoney;
  summary: ReportSummary;
}
