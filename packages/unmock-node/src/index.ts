import {
  defaultOptions as _defaultOptions,
  ignoreAuth as _ignoreAuth,
  ignoreStory as _ignoreStory,
  IUnmockInternalOptions,
  kcomnu as _kcomnu,
  unmock as _unmock,
} from "unmock-core";
import NodeBackend from "./backend";
import _WinstonLogger from "./logger/winston-logger";
import FSPersistence from "./persistence/fs-persistence";

export const WinstonLogger = _WinstonLogger;

const logger = new _WinstonLogger();

export const defaultOptions: IUnmockInternalOptions = {
  ..._defaultOptions,
  backend: new NodeBackend(),
  logger,
  persistence: new FSPersistence(logger),
};

export const ignoreStory = _ignoreStory(defaultOptions);
export const ignoreAuth = _ignoreAuth(defaultOptions);
export const unmock = _unmock(defaultOptions);
export const kcomnu = _kcomnu(defaultOptions);
