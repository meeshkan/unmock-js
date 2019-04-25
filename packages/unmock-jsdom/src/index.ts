import {
  defaultOptions as _defaultOptions,
  ignoreAuth as _ignoreAuth,
  ignoreStory as _ignoreStory,
  IUnmockInternalOptions,
  kcomnu as _kcomnu,
  unmock as _unmock,
} from "unmock-core";
import JSDomBackend from "./backend";
import BrowserLogger from "./logger/browser-logger";
import BrowserStoragePersistence from "./persistence/local-storage-persistence";

export const defaultOptions: IUnmockInternalOptions = {
  ..._defaultOptions,
  backend: new JSDomBackend(),
  // turning a bug into a feature - JSDOM cannot handle headers, so we ignore it by default
  // once it can handle headers, we can turn this off
  ignore: [_defaultOptions.ignore, "headers"],
  logger: new BrowserLogger(),
  persistence: new BrowserStoragePersistence(),
};

export const ignoreStory = _ignoreStory(defaultOptions);
export const ignoreAuth = _ignoreAuth(defaultOptions);
export const unmock = _unmock(defaultOptions);
export const kcomnu = _kcomnu(defaultOptions);
