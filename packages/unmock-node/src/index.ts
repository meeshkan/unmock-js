import { CorePackage, IUnmockPackage } from "unmock-core";
import NodeBackend from "./backend";
import _WinstonLogger from "./loggers/winston-logger";

// DSL
export { dsl } from "unmock-core";

// Sinon for asserts and matchers
export { sinon } from "unmock-core";

// Types
export * from "./types";

const backend = new NodeBackend();

const unmock: IUnmockPackage = new CorePackage(backend, {
  logger: new _WinstonLogger(),
});

export type UnmockNode = typeof unmock;

export default unmock;
