import { IncomingMessage, ServerResponse } from "http";
import Mitm from "mitm";
import {
  constants,
  hash as _hash,
  IBackend,
  IStories,
  snapshot,
  UnmockOptions,
  util,
} from "unmock-core";
import { computeHashV0 } from "unmock-hash";
import passthrough from "./passthrough";
import { rawHeadersToHeaders } from "./util";

const { buildPath, endReporter, makeAuthHeader } = util;
const { UNMOCK_UA_HEADER_NAME } = constants;
const MOSES = "MOSES";

let mitm: any;

const mHttp = (
  userId: string | null,
  story: IStories,
  token: string | undefined,
  opts: UnmockOptions,
  req: IncomingMessage,
  res: ServerResponse,
) => {
  const { Host, ...rawHeaders } = rawHeadersToHeaders(req.rawHeaders);
  const [reqHost, reqPort] = Host.split(":");
  const { signature, ignore, persistence, unmockHost, unmockPort } = opts;
  if (opts.isWhitelisted(reqHost)) {
    passthrough(
      req,
      res,
      ({ body }) => ({
        body,
        hash: "", // hash not relevant as this is not an unmock call
        headers: rawHeaders,
        host: reqHost,
        intercepted: false,
        method: req.method || "",
        path: req.url || "",
        port: reqPort ? parseInt(reqPort, 10) : 443,
        req,
        res,
      }),
      () => undefined,
    );
    return;
  }
  // tslint:disable-next-line:max-line-length
  const pathForFake = buildPath(
    opts,
    rawHeaders,
    reqHost,
    req.method,
    req.url,
    story.story,
    token !== undefined,
  );
  const doEndReporting = (fromCache: boolean) => (
    hash: string,
    requestBody: Buffer[],
    responseHeaders: any,
    responseBody: Buffer[],
  ) =>
    endReporter(
      opts,
      hash,
      story.story,
      token !== undefined,
      fromCache,
      {
        lang: "node",
      },
      {
        ...(requestBody.length > 0
          ? { body: requestBody.map((buffer) => buffer.toString()).join("") }
          : {}),
        headers: rawHeaders,
        host: reqHost,
        method: req.method,
        path: req.url,
      },
      {
        headers: responseHeaders,
        ...(responseBody.length > 0
          ? { hostname: responseBody.map((buffer) => buffer.toString()).join("") }
          : {}),
      },
    );
  const unmockHeaders = {
    [UNMOCK_UA_HEADER_NAME]: JSON.stringify("node"),
    ...(token ? makeAuthHeader(token) : {}),
  };
  passthrough(
    req,
    res,
    ({ body, headers, host, method, path }) => {
      const hashable = {
        body:
          body.length > 0 ? body.map((buffer) => buffer.toString()).join("") : {},
        headers,
        hostname: host,
        method,
        path,
        story: story.story,
        user_id: userId ? userId : MOSES,
        ...(signature ? { signature } : {}),
      };
      const hash = computeHashV0(hashable, ignore);
      const makesNetworkCall = opts.shouldMakeNetworkCall(hash);
      snapshot({
        hash,
        host,
        method,
        path,
      });
      if (!makesNetworkCall) {
        const response = persistence.loadResponse(hash);
        Object.entries(response.headers).forEach(([k, v]) => {
          res.setHeader(k, `${v}`);
        });
        res.write(response.body);
        res.end();
        doEndReporting(true)(
          hash,
          body,
          response.headers,
          !response.body ? [] : [Buffer.from(response.body)],
        );
        return {
          body,
          hash,
          headers,
          host,
          intercepted: true,
          method,
          path,
          port: 443,
          req,
          res,
        };
      } else {
        return {
          body,
          hash,
          headers: unmockHeaders,
          host: unmockHost,
          intercepted: false,
          method,
          path: pathForFake || "",
          port: parseInt(unmockPort, 10),
          req,
          res,
        };
      }
    },
    doEndReporting(false),
  );
};

export default class NodeBackend implements IBackend {
  public reset() {
    mitm.disable();
  }
  public initialize(
    userId: string,
    story: { story: string[] },
    token: string | undefined,
    options: UnmockOptions,
  ) {
    mitm = Mitm();
    mitm.on("connect", (socket: any, opts: any) => {
      if (opts.shouldBypass) {
        socket.bypass();
      }
    });
    mitm.on("request", (req: IncomingMessage, res: ServerResponse) => {
      mHttp(userId, story, token, options, req, res);
    });
  }
}
