import { ILogger } from "unmock";

export default class BrowserLogger implements ILogger {
  public log(message: string) {
    // tslint:disable-next-line:no-console
    console.log(message);
  }
}
