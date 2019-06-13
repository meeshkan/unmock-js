import { IncomingMessage, ServerResponse } from "http";
import Mitm from "mitm";
import {
  IBackend,
  IMetaData,
  UnmockOptions,
  util,
} from "unmock-core";

const { doUsefulStuffWithRequestAndResponse } = util;
const metaData: IMetaData = {
  lang: "node",
};
const BufferToStringOrEmpty = (buffer: Buffer[], key: string) => {
  const retObj: { [key: string]: string } = {};
  if (buffer.length > 0) {
    retObj[key] = buffer.map((b) => b.toString()).join("");
  }
  return retObj;
};

let mitm: any;

const mHttp = (
  opts: UnmockOptions,
  req: IncomingMessage,
  res: ServerResponse,
) => {
  const { host, ...rawHeaders } = req.headers;
  const reqHost = (host || "").split(":")[0];

  const outgoingData: Buffer[] = [];

  req.on("data", (chunk) => outgoingData.push(chunk));

  req.on("end", () => {
    const doEndReporting = (
      responseHeaders: any,
      responseBody: Buffer[],
    ) =>
    doUsefulStuffWithRequestAndResponse(
        opts,
        metaData,
        {
          ...BufferToStringOrEmpty(outgoingData, "body"),
          headers: rawHeaders,
          host: reqHost,
          method: req.method,
          path: req.url,
        },
        {
          headers: responseHeaders,
          ...BufferToStringOrEmpty(responseBody, "body"),
        },
      );

    // Restore information from cache and send via `res`
    const response = { body: "", headers: {}};
    if (response.body) {
      res.write(response.body);
    }
    res.end();
    doEndReporting(
      response.headers,
      !response.body ? [] : [Buffer.from(response.body)],
    );
  });
};

export default class NodeBackend implements IBackend {
  public reset() {
    mitm.disable();
  }
  public initialize(
    options: UnmockOptions,
  ) {
    mitm = Mitm();
    mitm.on("connect", (socket: any, opts: any) => {
      if (options.isWhitelisted(opts.host)) {
        socket.bypass();
      }
    });
    mitm.on("request", (req: IncomingMessage, res: ServerResponse) => {
      mHttp(options, req, res);
    });
  }
}
