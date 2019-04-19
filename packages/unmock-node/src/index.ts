import {
  defaultOptions as _defaultOptions,
  ignoreAuth as _ignoreAuth,
  ignoreStory as _ignoreStory,
  IUnmockInternalOptions,
  kcomnu as _kcomnu,
  unmock as _unmock,
} from "unmock";
import NodeBackend from "./backend";
import WinstonLogger from "./logger/winston-logger";
import FSPersistence from "./persistence/local-storage-persistence";

export const defaultOptions: IUnmockInternalOptions = {
  ..._defaultOptions,
  backend: new NodeBackend(),
  logger: new WinstonLogger(),
  persistence: new FSPersistence(),
};

export const ignoreStory = _ignoreStory(defaultOptions);
export const ignoreAuth = _ignoreAuth(defaultOptions);
export const unmock = _unmock(defaultOptions);
export const kcomnu = _kcomnu(defaultOptions);
