import { CorePackage } from "unmock-core";
import JSDomBackend from "./backend";
import BrowserLogger from "./logger/browser-logger";

const backend = new JSDomBackend();

class UnmockJSDOM extends CorePackage {
  public states() {
    throw new Error("Unmock JSDOM does not implement state management yet!");
  }
}

const unmock = new UnmockJSDOM(backend, {
  logger: new BrowserLogger(),
});

export default unmock;
