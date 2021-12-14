process.env.NTBA_FIX_319 = "1";

import yargs from "yargs";
import figlet from "figlet";
import Worker from "./Worker";

function printHello() {
  return new Promise<void>((resolve, reject) => {
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

  const worker = new Worker({
    tinkoffToken: args["tinkoff-token"],
    telegramToken: args["telegram-token"],
    telegramChatId: Number(args["telegram-chat"]),
  });

  await worker.run();
}
