import {
  kcomnu as _kcomnu,
  unmock as _unmock,
  UnmockOptions,
} from "unmock-core";
import NodeBackend from "./backend";
import _WinstonLogger from "./logger/winston-logger";
export const WinstonLogger = _WinstonLogger;

const logger = new _WinstonLogger();

const defaultOptions = new UnmockOptions({
  logger,
});

const backend = new NodeBackend();

export const states = backend.states;

export const unmock = _unmock(defaultOptions, backend);
export const kcomnu = _kcomnu;
