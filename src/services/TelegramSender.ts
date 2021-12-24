import TelegramBot from "node-telegram-bot-api";
import { Report } from "../types/report";
import {
  createDetailsMessage,
  createErrorMessage,
  createReportMessage,
} from "../helpers/messages";

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

  async sendPortfolioDetails(report: Report) {
    try {
      const message = createDetailsMessage(report);

      console.log("Отправка отчета в чат...");

      await this._telegramBot.sendMessage(this._chatId, message, {
        parse_mode: "HTML",
        disable_web_page_preview: true,
      });
    } catch (e) {
      console.log(e);
    }
  }

  async sendPortfolioReport(report: Report) {
    try {
      const message = createReportMessage(report);

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
      const message = createErrorMessage(e);

      await this._telegramBot.sendMessage(this._chatId, message, {
        parse_mode: "HTML",
        disable_notification: true,
      });
    } catch (e) {
      console.log(e);
    }
  }
}
