import TelegramBot from "node-telegram-bot-api";
import { getFormattedPriceValue } from "./helpers";
import { PortfolioReport } from "./types";

export default class TelegramSender {
  private _telegramBot: TelegramBot;
  private _chatId: number;

  constructor(telegramBot: TelegramBot, chatId: number) {
    this._telegramBot = telegramBot;
    this._chatId = chatId;
  }

  get chatId() {
    return this._chatId;
  }

  async sendPortfolioDetails(report: PortfolioReport) {
    try {
      let message = "";

      report.positions.forEach((position) => {
        message +=
          `<b>${position.name}</b>\n` +
          `${this.getPriceString(
            position.currency,
            position.price,
            position.yield
          )}\n\n`;
      });

      message +=
        `<b>Баланс:</b>\n` +
        this.getPriceString(
          report.accountBalance.currency,
          report.accountBalance.price
        );

      console.log("Отправка отчета в чат...");

      await this._telegramBot.sendMessage(this._chatId, message, {
        parse_mode: "HTML",
      });
    } catch (e) {
      console.log(e);
    }
  }

  async sendPortfolioReport(report: PortfolioReport) {
    try {
      await this._telegramBot.sendMessage(
        this._chatId,
        this.getPriceString(report.currency, report.price, report.yield),
        {
          parse_mode: "HTML",
          disable_notification: true,
        }
      );
    } catch (e) {
      console.log(e);
    }
  }

  async sendError(e: Error) {
    try {
      const message = `<b>Ошибка:</b>\n<pre>${e.message}</pre>`;

      await this._telegramBot.sendMessage(this._chatId, message, {
        parse_mode: "HTML",
        disable_notification: true,
      });
    } catch (e) {
      console.log(e);
    }
  }

  private getPriceString(currency: string, price: number, yield_ = 0) {
    let str = `💼 ${getFormattedPriceValue(price)} ${currency}`;

    if (yield_) {
      const yieldIcon = yield_ > 0 ? "✅" : "🆘";
      const yieldSign = yield_ > 0 ? "+" : "";
      const fixedYield = getFormattedPriceValue(yield_);
      const fixedYieldPercents = ((yield_ / (price - yield_)) * 100).toFixed(2);

      str +=
        `\n${yieldIcon} ${yieldSign}${fixedYield} ${currency}` +
        ` (${yieldSign}${fixedYieldPercents}%)`;
    }

    return str;
  }
}
