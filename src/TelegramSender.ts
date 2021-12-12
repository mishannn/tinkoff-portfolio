import TelegramBot from "node-telegram-bot-api";
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
          `<b>${position.name}:</b> ` +
          `${this.getPriceString(
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

      await this._telegramBot.sendMessage(this._chatId, message, {
        parse_mode: "HTML",
      });
    } catch (e) {
      console.log(e);
    }
  }

  async sendPortfolioReport(report: PortfolioReport) {
    try {
      const message =
        `<b>Портфель:</b> ` +
        `${this.getPriceString(report.currency, report.price, report.yield)}`;

      await this._telegramBot.sendMessage(this._chatId, message, {
        parse_mode: "HTML",
        disable_notification: true,
      });
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

  private getPriceString(currency: string, price: number, yield_: number) {
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
}
