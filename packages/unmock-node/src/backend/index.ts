import { IncomingMessage, ServerResponse } from "http";
import Mitm from "mitm";
import { IBackend, UnmockOptions } from "unmock-core";
import * as constants from "./constants";
import { handleRequestResponse } from "./handler";
import { responseFinderFactory } from "./response-finder";

let mitm: any;
export default class NodeBackend implements IBackend {
  public reset() {
    if (mitm) {
      mitm.disable();
    }
  }
  public initialize(options: UnmockOptions) {
    mitm = Mitm();
    mitm.on("connect", (socket: any, opts: any) => {
      if (options.isWhitelisted(opts.host)) {
        socket.bypass();
      }
    });
    const findResponse = responseFinderFactory();
    mitm.on("request", async (req: IncomingMessage, res: ServerResponse) => {
      try {
        await handleRequestResponse(findResponse, req, res);
      } catch (err) {
        res.statusCode = constants.STATUS_CODE_FOR_ERROR;
        res.write(err.message);
        res.end();
      }
    });
  }
}
