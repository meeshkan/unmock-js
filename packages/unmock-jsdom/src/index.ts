import {
  kcomnu as _kcomnu,
  unmock as _unmock,
  UnmockOptions,
} from "unmock-core";
import JSDomBackend from "./backend";
import BrowserLogger from "./logger/browser-logger";

export const defaultOptions = new UnmockOptions({
  logger: new BrowserLogger(),
});
const backend = new JSDomBackend();

export const unmock = _unmock(defaultOptions, backend);
export const kcomnu = _kcomnu;
