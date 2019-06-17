import { IncomingMessage, ServerResponse } from "http";
import Mitm from "mitm";
import { IBackend, IMock, UnmockOptions } from "unmock-core";
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
      // TODO How to handle error?
      try {
        await handleRequestResponse(findResponse, req, res);
      } catch (err) {
        res.statusCode = 501;
        res.write(err.message);
        res.end();
      }
    });
  }
}
