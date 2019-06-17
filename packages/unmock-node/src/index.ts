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

// TODO Find mocks
const mockGenerator = () => [];

const backend = new NodeBackend(mockGenerator);

export const unmock = _unmock(defaultOptions, backend);
export const kcomnu = _kcomnu;
