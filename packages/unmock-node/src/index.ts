import { CorePackage, dsl } from "unmock-core";
import NodeBackend from "./backend";
import _WinstonLogger from "./loggers/winston-logger";

const backend = new NodeBackend();

class UnmockNode extends CorePackage {
  public states() {
    return (this.backend as NodeBackend).states;
  }
}

const unmock = new UnmockNode(backend, { logger: new _WinstonLogger() });

module.exports = exports = unmock;

exports.dsl = dsl;
exports.default = unmock;
