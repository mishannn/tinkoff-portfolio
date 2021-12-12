import OpenAPI from "@tinkoff/invest-openapi-js-sdk";

const apiURL = "https://api-invest.tinkoff.ru/openapi";
const socketURL = "wss://api-invest.tinkoff.ru/openapi/md/v1/md-openapi/ws";

export default class InvestApi extends OpenAPI {
  constructor(tinkoffToken: string) {
    super({ apiURL, socketURL, secretToken: tinkoffToken });
  }
}
