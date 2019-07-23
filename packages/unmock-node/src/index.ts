import { CorePackage, UnmockOptions } from "unmock-core";
import NodeBackend from "./backend";
import _WinstonLogger from "./logger/winston-logger";
export { dsl } from "unmock-core";

const backend = new NodeBackend();

const options = new UnmockOptions({ logger: new _WinstonLogger() });

class UnmockNode extends CorePackage {
  public states() {
    return (this.backend as NodeBackend).states;
  }
}

export const unmock = new UnmockNode(options, backend);
