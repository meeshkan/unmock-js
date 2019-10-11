import { UnmockPackage } from "unmock-core";
import NodeBackend from "./backend";
import WinstonLogger from "./loggers/winston-logger";

export const unmock = new UnmockPackage(new NodeBackend(), {
  logger: new WinstonLogger(),
});

export const nock = unmock.nock.bind(unmock);
export const runner = unmock.runner.bind(unmock);

export default unmock;
