import interval from "interval-promise";
import TelegramBot, { Message } from "node-telegram-bot-api";
import CurrencyConverter from "./CurrencyConverter";
import { getError } from "./helpers";
import InvestApi from "./InvestApi";
import PortfolioParser from "./PortfolioParser";
import TelegramSender from "./TelegramSender";

const botCommands = [
  {
    command: "/details",
    description: "Получить детали портфеля",
  },
];

export interface WorkerOptions {
  tinkoffToken: string;
  telegramToken: string;
  telegramChatId: number;
}

export default class Worker {
  private _investApi: InvestApi;
  private _telegramBot: TelegramBot;
  private _currencyConverter: CurrencyConverter;
  private _portfolioParser: PortfolioParser;
  private _telegramSender: TelegramSender;

  constructor(options: WorkerOptions) {
    this._investApi = new InvestApi(options.tinkoffToken);

    this._currencyConverter = new CurrencyConverter();
    this._portfolioParser = new PortfolioParser(
      this._investApi,
      this._currencyConverter,
      "RUB"
    );

    this._telegramBot = new TelegramBot(options.telegramToken, {
      polling: true,
    });
    this._telegramSender = new TelegramSender(
      this._telegramBot,
      options.telegramChatId
    );
  }

  private async onDetailsCommand(message: Message): Promise<void> {
    const chatId = this._telegramSender.chatId;

    if (message.text !== "/details" || message.from?.id !== chatId) return;

    await this.parseAndSendPortfolioDetails();
  }

  private async initializeTelegram() {
    this._telegramBot.on("message", (message) =>
      this.onDetailsCommand(message)
    );

    await this._telegramBot.setMyCommands(botCommands);
  }

  private async parseAndSendPortfolioReport(): Promise<void> {
    try {
      const normalTrading = this._portfolioParser.testNormalTrading();

      if (!normalTrading) {
        throw new Error("Биржа недоступна");
      }

      const report = await this._portfolioParser.getPortfolioReport();

      if (!report) return;

      await this._telegramSender.sendPortfolioReport(report);
    } catch (e) {
      console.log(e);

      this._telegramSender.sendError(getError(e));
    }
  }

  private async parseAndSendPortfolioDetails(): Promise<void> {
    try {
      const report = await this._portfolioParser.getPortfolioReport();

      if (!report) return;

      await this._telegramSender.sendPortfolioDetails(report);
    } catch (e) {
      console.log(e);

      this._telegramSender.sendError(getError(e));
    }
  }

  async run() {
    await this.initializeTelegram();

    const intervalMinutes = 30;

    await this.parseAndSendPortfolioReport();

    console.log(`Ожидание ${intervalMinutes} мин...`);

    interval(async () => {
      await this.parseAndSendPortfolioReport();

      console.log(`Ожидание ${intervalMinutes} мин...`);
    }, intervalMinutes * 60 * 1000);
  }
}
