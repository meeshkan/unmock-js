import { IncomingMessage, ServerResponse } from "http";
import Mitm from "mitm";
import { hash as _hash, IBackend, IUnmockInternalOptions, Mode, util } from "unmock-core";
import passthrough from "./passthrough";
import { rawHeadersToHeaders } from "./util";

const { v0 } = _hash;

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
  let selfcall = false;
  const { Host, ...rawHeaders } = rawHeadersToHeaders(req.rawHeaders);
  const [host, port] = Host.split(":");
  if (hostIsWhitelisted(whitelist, host, host)) {
    passthrough(
      req,
      res,
      ({ body }) => ({
        body,
        hash: "", // hash not relevant as this is not an unmock call
        headers: rawHeaders,
        host,
        intercepted: false,
        method: req.method || "",
        path: req.url || "",
        port: port ? parseInt(port, 10) : 443,
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
    host,
    host,
    ignore,
    req.method,
    req.url,
    signature,
    story.story,
    unmockHost,
    token !== undefined,
  );
  if (host === unmockHost) {
    // self call, we ignore
    selfcall = true;
  }
  const doEndReporting = (fromCache: boolean) => (hash: string, headers: any, body: any, data: any) => endReporter(
    hash,
    body,
    data,
    headers,
    host,
    host,
    logger,
    req.method,
    req.url,
    persistence,
    save,
    selfcall,
    story.story,
    token !== undefined,
    "node",
    fromCache,
    {
      requestHeaders: rawHeaders,
      requestHost: host,
      requestMethod: req.method,
      requestPath: req.url,
    },
  );
  const unmockHeaders = {
    [UNMOCK_UA_HEADER_NAME]: JSON.stringify("node"),
    ...(token ? {Authorization: `Bearer ${token}`} : {}),
  };
  passthrough(
    req,
    res,
     ({
      body,
      headers,
      host,
      method,
      path,
     }) => {
      const incoming = body ? body.map((buffer) => buffer.toString()).join("") : {};
      const hashable = {
        body: incoming,
        headers,
        hostname: host,
        method,
        path,
        story: story.story,
        user_id: userId ? userId : MOSES,
        ...(signature ? {signature} : {}),
      };
      const hash = v0(hashable, ignore);
      const hasHash = persistence.hasHash(hash);
      const makesNetworkCall = mode === Mode.ALWAYS_CALL_UNMOCK ||
        (mode === Mode.CALL_UNMOCK_FOR_NEW_MOCKS && !hasHash);
      if (!makesNetworkCall) {
        const { responseHeaders, responseBody } = persistence.loadMock(hash);
        Object.entries(responseHeaders).forEach(([k, v]) => {
          res.setHeader(k, `${v}`);
        });
        res.write(responseBody);
        res.end();
        doEndReporting(true)(hash, responseHeaders, responseBody, incoming);
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
    mitm.on("request", async (req: IncomingMessage, res: ServerResponse) => {
      mHttp(userId, story, token, options, req, res);
    });
  }
}
