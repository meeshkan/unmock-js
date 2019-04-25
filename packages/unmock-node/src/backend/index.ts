import { IncomingMessage, ServerResponse } from "http";
import Mitm from "mitm";
import {
  IBackend,
  IUnmockInternalOptions,
  Mode,
  snapshot,
  util,
} from "unmock-core";
import { computeHashV0 } from "unmock-hash";
import passthrough from "./passthrough";
import { rawHeadersToHeaders } from "./util";

const {
  buildPath,
  endReporter,
  hostIsWhitelisted,
  UNMOCK_UA_HEADER_NAME,
} = util;

const MOSES = "MOSES";

let mitm: any;

const mHttp = (
  userId: string | null,
  story: { story: string[] },
  token: string | undefined,
  {
    logger,
    mode,
    persistence,
    unmockHost,
    unmockPort,
    signature,
    save,
    ignore,
    whitelist,
  }: IUnmockInternalOptions,
  req: IncomingMessage,
  res: ServerResponse,
) => {
  const { Host, ...rawHeaders } = rawHeadersToHeaders(req.rawHeaders);
  const [h, p] = Host.split(":");
  if (hostIsWhitelisted(whitelist, h, p)) {
    passthrough(
      req,
      res,
      ({ body }) => ({
        body,
        hash: "", // hash not relevant as this is not an unmock call
        headers: rawHeaders,
        host: h,
        intercepted: false,
        method: req.method || "",
        path: req.url || "",
        port: p ? parseInt(p, 10) : 443,
        req,
        res,
      }),
      () => undefined,
    );
    return;
  }
  // tslint:disable-next-line:max-line-length
  const pathForFake = buildPath(
    rawHeaders,
    h,
    p,
    ignore,
    req.method,
    req.url,
    signature,
    story.story,
    unmockHost,
    token !== undefined,
  );
  const doEndReporting = (fromCache: boolean) => (
    hash: string,
    requestBody: Buffer[],
    responseHeaders: any,
    responseBody: Buffer[],
  ) =>
    endReporter(
      hash,
      logger,
      persistence,
      save,
      story.story,
      token !== undefined,
      fromCache,
      {
        lang: "node",
      },
      {
        ...(requestBody.length > 0
          ? { body: requestBody.map(buffer => buffer.toString()).join("") }
          : {}),
        headers: rawHeaders,
        host: h,
        method: req.method,
        path: req.url,
      },
      {
        headers: responseHeaders,
        ...(responseBody.length > 0
          ? { body: responseBody.map(buffer => buffer.toString()).join("") }
          : {}),
      },
    );
  const unmockHeaders = {
    [UNMOCK_UA_HEADER_NAME]: JSON.stringify("node"),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  passthrough(
    req,
    res,
    ({ body, headers, host, method, path }) => {
      const hashable = {
        body:
          body.length > 0 ? body.map(buffer => buffer.toString()).join("") : {},
        headers,
        hostname: host,
        method,
        path,
        story: story.story,
        user_id: userId ? userId : MOSES,
        ...(signature ? { signature } : {}),
      };
      const hash = computeHashV0(hashable, ignore);
      const hasHash = persistence.hasHash(hash);
      const makesNetworkCall =
        mode === Mode.ALWAYS_CALL_UNMOCK ||
        (mode === Mode.CALL_UNMOCK_FOR_NEW_MOCKS && !hasHash);
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
    options: IUnmockInternalOptions,
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
