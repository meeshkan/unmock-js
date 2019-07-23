import { CorePackage, UnmockOptions } from "unmock-core";
import JSDomBackend from "./backend";
import BrowserLogger from "./logger/browser-logger";

export const options = new UnmockOptions({
  logger: new BrowserLogger(),
});
const backend = new JSDomBackend();

class UnmockJSDOM extends CorePackage {
  public states() {
    throw new Error("Unmock JSDOM does not implement state management yet!");
  }
}

export const unmock = new UnmockJSDOM(options, backend);
