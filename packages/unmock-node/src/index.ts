import { CorePackage } from "unmock-core";
import NodeBackend from "./backend";
import _WinstonLogger from "./loggers/winston-logger";

// DSL
export { dsl } from "unmock-core";

// Types
export * from "./types";

const backend = new NodeBackend();

class UnmockNode extends CorePackage {
  public states() {
    return (this.backend as NodeBackend).states;
  }
}

const unmock = new UnmockNode(backend, { logger: new _WinstonLogger() });
export default unmock;
