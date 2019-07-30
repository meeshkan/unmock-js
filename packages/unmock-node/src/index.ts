import { CorePackage } from "unmock-core";
import NodeBackend from "./backend";
import _WinstonLogger from "./logger/winston-logger";
export { dsl } from "unmock-core";

const backend = new NodeBackend();

class UnmockNode extends CorePackage {
  public states() {
    return (this.backend as NodeBackend).states;
  }
}

const unmock = new UnmockNode(backend, { logger: new _WinstonLogger() });
export default unmock;
