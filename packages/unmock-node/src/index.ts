import {
  ignoreAuth as _ignoreAuth,
  ignoreStory as _ignoreStory,
  kcomnu as _kcomnu,
  unmock as _unmock,
  UnmockOptions,
} from "unmock-core";
import NodeBackend from "./backend";
import WinstonLogger from "./logger/winston-logger";
import FSPersistence from "./persistence/fs-persistence";

const logger = new WinstonLogger();

const defaultOptions = new UnmockOptions({
  logger,
  persistence: new FSPersistence(logger),
});

const backend = new NodeBackend();

export const ignoreStory = _ignoreStory(defaultOptions);
export const ignoreAuth = _ignoreAuth(defaultOptions);
export const unmock = _unmock(defaultOptions, backend);
export const kcomnu = _kcomnu(backend);
