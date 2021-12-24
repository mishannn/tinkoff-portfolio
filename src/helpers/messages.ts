import { InstrumentType } from "@tinkoff/invest-openapi-js-sdk";
import { Report, ReportPosition } from "../types/report";
import { getCostString } from "./formatting";

export function createErrorMessage(error: Error) {
  return `<b>Ошибка:</b>\n<pre>${error.message}</pre>`;
}

export function createReportMessage(report: Report) {
  return getCostString({
    cost: report.summary.cost,
    yield_: report.summary.yield,
    currency: report.summary.currency,
  });
}

const instrumentTypeUrlCategory: Record<InstrumentType, string> = {
  Stock: "stocks",
  Etf: "etfs",
  Currency: "currencies",
  Bond: "bonds",
};

export function getPositionUrl(position: ReportPosition): string {
  if (!position.ticker) {
    return "";
  }

  const category = instrumentTypeUrlCategory[position.type];

  return `https://www.tinkoff.ru/invest/${category}/${position.ticker}`;
}

export function createDetailsMessage(report: Report) {
  let message = "";

  report.positions.forEach((position) => {
    message += `<b>${position.name} (${position.balance} шт.)</b>\n`;

    const positionUrl = getPositionUrl(position);

    if (positionUrl) {
      message += `${positionUrl}\n`;
    }

    const positionCostString = getCostString({
      balance: position.balance,
      currency: position.currency,
      cost: position.cost,
      yield_: position.yield,
    });

    message += `${positionCostString}\n\n`;
  });

  const accountMoneyCostString = getCostString({
    cost: report.accountMoney.balance,
    currency: report.accountMoney.currency,
  });

  message += `<b>Баланс:</b>\n${accountMoneyCostString}`;

  return message;
}
