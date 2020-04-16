import * as fetch from "node-fetch";
import { UnmockPackage } from "unmock-core";
import NodeBackend from "./backend";
import FsSnapshotter from "./loggers/snapshotter";
import WinstonLogger from "./loggers/winston-logger";

const utils = { snapshotter: FsSnapshotter };
export { utils };
export { fetch };
export { NodeBackend };

export const unmock = new UnmockPackage(new NodeBackend(), {
  logger: new WinstonLogger(),
});

export const nock = unmock.mock.bind(unmock);
export const mock = unmock.mock.bind(unmock);
export default unmock;
