import * as fetch from "node-fetch";
import { UnmockPackage } from "unmock-core";
import NodeBackend from "./backend";
import FsSnapshotter from "./loggers/snapshotter";
import WinstonLogger from "./loggers/winston-logger";
import ServerBackend from "./server";

const utils = { snapshotter: FsSnapshotter };
export { utils };
export { fetch };

export const unmock = new UnmockPackage(new NodeBackend(), {
  logger: new WinstonLogger(),
});

export const nock = unmock.nock.bind(unmock);
export const runner = unmock.runner.bind(unmock);

const serverUrl = "http://localhost:9000";
export const server = new UnmockPackage(new ServerBackend({ url: serverUrl }));

export default unmock;
