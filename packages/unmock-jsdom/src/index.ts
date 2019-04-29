import {
  ignoreAuth as _ignoreAuth,
  ignoreStory as _ignoreStory,
  kcomnu as _kcomnu,
  unmock as _unmock,
  UnmockOptions,
} from "unmock-core";
import JSDomBackend from "./backend";
import BrowserLogger from "./logger/browser-logger";
import BrowserStoragePersistence from "./persistence/browser-storage-persistence";

export const defaultOptions = new UnmockOptions({
  logger: new BrowserLogger(),
  persistence: new BrowserStoragePersistence(),
});
const backend = new JSDomBackend();
// turning a bug into a feature - JSDOM cannot handle headers, so we ignore it by default
// once it can handle headers, we can turn this off
defaultOptions.addIgnore("headers");

export const ignoreStory = _ignoreStory(defaultOptions);
export const ignoreAuth = _ignoreAuth(defaultOptions);
export const unmock = _unmock(defaultOptions, backend);
export const kcomnu = _kcomnu(backend);
