import { unmock, UnmockOptions } from "unmock-core";
import JSDomBackend from "./backend";
import BrowserLogger from "./logger/browser-logger";

export const options = new UnmockOptions({
  logger: new BrowserLogger(),
});
const backend = new JSDomBackend();

export const on = unmock(options, backend);
export const init = on;
export const initialize = on;
export const off = backend.reset();
