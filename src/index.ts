process.env.NTBA_FIX_319 = "1";

import OpenAPI from "@tinkoff/invest-openapi-js-sdk";
import axios from "axios";
import TelegramBot from "node-telegram-bot-api";
import interval from "interval-promise";
import yargs from "yargs";
import figlet from "figlet";

const ACCOUNT_BALANCE_CURRENCY = "RUB";

interface ConvertCurrencyRate {
  srcCurrency: string;
  dstCurrency: string;
  value: number;
}

interface PortfolioReportItem {
  currency: string;
  price: number;
  yield: number;
}

interface PortfolioReportPosition extends PortfolioReportItem {
  name: string;
  ticker: string;
}

interface PortfolioReport extends PortfolioReportItem {
  positions: PortfolioReportPosition[];
  accountBalance: {
    currency: string;
    price: number;
  };
}

async function getCurrencies() {
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

  if (!values) {
    throw new Error("Сервер не отправил список валют");
  }

  const currencies: ConvertCurrencyRate[] = [];

  values.forEach((value: any) => {
    const ticker: string = value?.symbol?.ticker;
    const price: number = value?.prices?.last?.value;

    if (!ticker || ticker.length !== 6 || !price) return;

    const srcCurrency = ticker.substr(0, 3);
    const dstCurrency = ticker.substr(3, 3);

    currencies.push({ srcCurrency, dstCurrency, value: price });
  });

  return currencies;
}

function getCurrencyRate(
  currencies: ConvertCurrencyRate[],
  srcCurrency: string,
  dstCurrency: string
) {
  const foundCurrency = currencies.find((currency) => {
    return (
      currency.srcCurrency === srcCurrency &&
      currency.dstCurrency === dstCurrency
    );
  });

  if (!foundCurrency) {
    const foundReverseCurrency = currencies.find((currency) => {
      return (
        currency.srcCurrency === dstCurrency &&
        currency.dstCurrency === srcCurrency
      );
    });

    return foundReverseCurrency ? 1 / foundReverseCurrency.value : undefined;
  }

  return foundCurrency.value;
}

async function getPortfolioReport(api: OpenAPI, targetCurrency: string) {
  try {
    console.log("Создание отчета...");

    const portfolioReport: PortfolioReport = {
      currency: targetCurrency,
      price: 0,
      yield: 0,
      positions: [],
      accountBalance: {
        currency: targetCurrency,
        price: 0,
      },
    };

    const currencies = await getCurrencies();
    const portfolio = await api.portfolio();

    portfolio.positions.forEach((position) => {
      const averagePositionPrice = position.averagePositionPrice;
      const expectedYield = position.expectedYield;

      if (!averagePositionPrice || !expectedYield) return;

      const positionPriceCurrency = averagePositionPrice.currency;

      let positionAveragePrice: number;
      if (positionPriceCurrency === targetCurrency) {
        positionAveragePrice = averagePositionPrice.value;
      } else {
        const rate = getCurrencyRate(
          currencies,
          positionPriceCurrency,
          targetCurrency
        );

        if (!rate) return;

        positionAveragePrice = averagePositionPrice.value * rate;
      }

      const positionYieldCurrency = expectedYield.currency;

      let positionYieldValue: number;
      if (positionYieldCurrency === targetCurrency) {
        positionYieldValue = expectedYield.value;
      } else {
        const rate = getCurrencyRate(
          currencies,
          positionYieldCurrency,
          targetCurrency
        );

        if (!rate) return;

        positionYieldValue = expectedYield.value * rate;
      }

      const positionName = position.name;
      const positionTicker = position.ticker;
      const positionBalance = position.balance;

      const positionTotalPrice =
        positionBalance * positionAveragePrice + positionYieldValue;

      portfolioReport.price += positionTotalPrice;
      portfolioReport.yield += positionYieldValue;
      portfolioReport.positions.push({
        currency: targetCurrency,
        name: positionName,
        price: positionTotalPrice,
        ticker: positionTicker || "",
        yield: positionYieldValue,
      });
    });

    const portfolioCurrencies = await api.portfolioCurrencies();
    const accountBalanceCurrencyObject = portfolioCurrencies.currencies.find(
      (currency) => {
        return currency.currency === ACCOUNT_BALANCE_CURRENCY;
      }
    );
    const accountBalancePrice = accountBalanceCurrencyObject?.balance || 0;

    if (ACCOUNT_BALANCE_CURRENCY === targetCurrency) {
      portfolioReport.price += accountBalancePrice;
      portfolioReport.accountBalance.price = accountBalancePrice;
    } else {
      const rate = getCurrencyRate(
        currencies,
        ACCOUNT_BALANCE_CURRENCY,
        targetCurrency
      );

      if (!rate) return;

      portfolioReport.price += accountBalancePrice * rate;
      portfolioReport.accountBalance.price = accountBalancePrice * rate;
    }

    return portfolioReport;
  } catch (e) {
    console.log(e);
    return undefined;
  }
}

function getPriceString(currency: string, price: number, yield_: number) {
  let str = `<code>${price.toFixed(2)} ${currency}</code>`;

  if (yield_) {
    str += ` | <i>${yield_ > 0 ? "+" : ""}${yield_.toFixed(2)} ${currency}`;

    const yieldPercents = yield_ / price;

    str +=
      ` (${yieldPercents > 0 ? "+" : ""}` +
      `${(yieldPercents * 100).toFixed(2)}%)</i>`;
  }

  return str;
}

async function sendPortfolioReport(
  bot: TelegramBot,
  chatId: string,
  report: PortfolioReport
) {
  try {
    let message =
      `<b>Портфель:</b> ` +
      `${getPriceString(report.currency, report.price, report.yield)}\n`;

    report.positions.forEach((position) => {
      message +=
        `<b>${position.name}:</b> ` +
        `${getPriceString(
          position.currency,
          position.price,
          position.yield
        )}\n`;
    });

    message +=
      `<b>Баланс:</b> ` +
      `<code>${report.accountBalance.price.toFixed(2)} ` +
      `${report.accountBalance.currency}</code>`;

    console.log("Отправка отчета в чат...");
    bot.sendMessage(chatId, message, {
      parse_mode: "HTML",
    });
  } catch (e) {
    console.log(e);
  }
}

function printHello() {
  return new Promise((resolve, reject) => {
    figlet("Portfolio Monitor", function (err, data) {
      if (err) {
        reject(err);
        return;
      }
      console.log(data);
      resolve();
    });
  });
}

export default async function main() {
  await printHello();

  const args = yargs
    .options({
      "tinkoff-token": {
        type: "string",
        description: "Tinkoff API token",
      },
      "telegram-token": {
        type: "string",
        description: "Telegram API token",
      },
      "telegram-chat": {
        type: "string",
        description: "Telegram chat ID",
      },
    })
    .demandOption(["tinkoff-token", "telegram-token", "telegram-chat"]).argv;

  const apiURL = "https://api-invest.tinkoff.ru/openapi";
  const socketURL = "wss://api-invest.tinkoff.ru/openapi/md/v1/md-openapi/ws";
  const secretToken = args["tinkoff-token"];
  const api = new OpenAPI({ apiURL, secretToken, socketURL });
  const bot = new TelegramBot(args["telegram-token"], {
    polling: false,
  });

  const intervalMinutes = 5;

  const report = await getPortfolioReport(api, "RUB");
  if (!report) return;
  sendPortfolioReport(bot, args["telegram-chat"], report);

  console.log(`Ожидание ${intervalMinutes} мин...`);

  interval(async () => {
    const report = await getPortfolioReport(api, "RUB");
    if (!report) return;
    sendPortfolioReport(bot, args["telegram-chat"], report);

    console.log(`Ожидание ${intervalMinutes} мин...`);
  }, intervalMinutes * 60 * 1000);
}