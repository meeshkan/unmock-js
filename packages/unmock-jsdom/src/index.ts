import { CorePackage } from "unmock-core";
import JSDomBackend from "./backend";
import BrowserLogger from "./logger/browser-logger";

const backend = new JSDomBackend();

const unmock = new CorePackage(backend, {
  logger: new BrowserLogger(),
});

export default unmock;
