import {
  IServiceDef,
  kcomnu as _kcomnu,
  ServiceParser,
  stateStoreFactory,
  unmock as _unmock,
  UnmockOptions,
} from "unmock-core";
import NodeBackend from "./backend";
import { FsServiceDefLoader } from "./loaders/fs-service-def-loader";
import _WinstonLogger from "./logger/winston-logger";
export const WinstonLogger = _WinstonLogger;

const logger = new _WinstonLogger();

const defaultOptions = new UnmockOptions({
  logger,
});

const backend = new NodeBackend();

export const unmock = _unmock(defaultOptions, backend);
export const kcomnu = _kcomnu;

const serviceLoader = new FsServiceDefLoader({
  servicesDir: process.env.RESOURCES_DIR,
});
const parser = new ServiceParser();
export const states = stateStoreFactory(
  serviceLoader
    .loadSync()
    .map((serviceDef: IServiceDef) => parser.parse(serviceDef)),
);
