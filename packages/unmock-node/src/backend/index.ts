import fr from "follow-redirects";
import http, { ClientRequest, IncomingMessage, RequestOptions } from "http";
import https from "https";
import { hash as _hash, IBackend, IUnmockInternalOptions, Mode, util } from "unmock-core";
import { URL } from "url";
import Socket from "./socket";

const { v0 } = _hash;

const {
  buildPath,
  endReporter,
  hostIsWhitelisted,
  UNMOCK_UA_HEADER_NAME,
} = util;

const httpreq = fr.http.request;
const httpreqmod = http.request;
const httpsreq = fr.https.request;
const httpsreqmod = https.request;

const MOSES = "MOSES";
const handleData = (responseData: Buffer[]) => (s: any) => responseData.push(s);
const foldData = (data: Buffer[]) => data.length > 0 ? data.map((datum) => datum.toString()).join("") : undefined;

/*
    body: req.body,
    headers: JSON.parse(req.query.headers),
    hostname: req.query.hostname,
    method: req.query.method.toUpperCase(),
    path: req.query.path,
    story: JSON.parse(req.query.story),
    user_id: userId,
    ...(req.query && req.query.signature ? {signature: req.query.signature} : {}),
*/

const mHttp = (
  proto: string,
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
  cb: {
    // tslint:disable-next-line:max-line-length
    (
      options: string | http.RequestOptions | URL,
      callback?: ((res: http.IncomingMessage) => void) | undefined,
    ): http.ClientRequest;
    // tslint:disable-next-line:max-line-length
    (
      url: string | URL,
      options: http.RequestOptions,
      callback?: ((res: http.IncomingMessage) => void) | undefined,
    ): http.ClientRequest;
  },
) => {
  // Return a function that will work for the overloaded methods
  // parameters will correspond to either of the following signatures:
  // request(options: RequestOptions | string | URL, callback?: (res: IncomingMessage) => void): ClientRequest;
  // request(url: string | URL, options: RequestOptions, callback?: (res: IncomingMessage) => void): ClientRequest;
  return (
    first: RequestOptions | string | URL,
    second: RequestOptions | ((res: IncomingMessage) => void) | undefined,
    third?: (res: IncomingMessage) => void,
  ): ClientRequest => {
    let data: string | undefined;
    let selfcall = false;
    const requestData: Buffer[] = [];
    const responseData: Buffer[] = [];
    const pushRequestData = handleData(requestData);
    const pushResponseData = handleData(responseData);
    const ro = (first instanceof URL || typeof first === "string"
      ? second
      : first) as RequestOptions;
    if (hostIsWhitelisted(whitelist, ro.host, ro.hostname)) {
      // TODO
      // we know this will work because this is the original signature, but is there
      // a better way to make this typesafe?
      return cb(first as any, second as any, third as any);
    }
    // tslint:disable-next-line:max-line-length
    const pathForFake = buildPath(
      ro.headers,
      ro.host,
      ro.hostname,
      ignore,
      ro.method,
      ro.path,
      signature,
      story.story,
      unmockHost,
      token !== undefined,
    );
    const href = `https://${unmockHost}${pathForFake}`;
    const originalHeaders = ro.headers;
    const fake = {
      ...ro,
      headers: {
        ...originalHeaders,
        host: unmockHost,
        hostname: unmockHost,
      },
      host: unmockHost,
      hostname: unmockHost,
      href,
      path: pathForFake,
      port: unmockPort,
    };
    if (ro.hostname === unmockHost || ro.host === unmockHost) {
      // self call, we ignore
      selfcall = true;
    }
    const doEndReporting = (fromCache: boolean, body: any, headers: any) => endReporter(
      body,
      data,
      headers,
      ro.host,
      ro.hostname,
      logger,
      ro.method,
      ro.path,
      persistence,
      save,
      selfcall,
      story.story,
      token !== undefined,
      "node",
      fromCache,
      {
        requestHeaders: ro.headers,
        requestHost: ro.hostname || ro.host || "",
        requestMethod: ro.method || "",
        requestPath: ro.path || "",
      },
    );
    // content being written or end of call!
    const resp = (res: IncomingMessage) => {
      const protoOn = res.on;
      res.on = (s: string, f: any) => {
        if (s === "data") {
          return protoOn.apply(res, [
            s,
            (d: any) => {
              pushResponseData(d);
              f(d);
            },
          ]);
        }
        if (s === "end") {
          return protoOn.apply(res, [
            s,
            (d: any) => {
              const body = foldData(responseData);
              doEndReporting(false, body, res.headers);
              // https://github.com/nodejs/node/blob/master/lib/_http_client.js
              // the original res.on('end') has a closure that refers to this
              // as far as i can understand, 'this' is supposed to refer to res
              f.apply(res, [d]);
            },
          ]);
        }
        return protoOn.apply(res, [s, f]);
      };
      if (second && typeof second === "function") {
        (second as ((res: IncomingMessage) => void))(res);
      } else if (third && typeof third === "function") {
        (third as ((res: IncomingMessage) => void))(res);
      }
    };
    const output = cb(fake, selfcall ? (second as ((res: IncomingMessage) => void)) : resp);
    if (token) {
      output.setHeader("Authorization", `Bearer ${token}`);
    }
    output.setHeader(UNMOCK_UA_HEADER_NAME, JSON.stringify("node"));
    const protoWrite = output.write;
    output.write = (d: Buffer, q?: any, z?: any) => {
      pushRequestData(d);
      return protoWrite.apply(output, [d, q, z]);
    };
    const protoEnd = output.end;
    output.end = (chunk: any, encoding?: any, maybeCallback?: () => void) => {
      if (typeof chunk !== "function" && chunk) {
        pushRequestData(chunk);
      }
      data = foldData(requestData);
      const fn = typeof chunk === "function" ?
        chunk : typeof encoding === "function" ?
        encoding : typeof maybeCallback === "function" ?
        maybeCallback : () => undefined;
      const hashable = {
        body: data ? data : {},
        headers: ro.headers,
        hostname: ro.hostname || ro.host,
        method: ro.method ? ro.method.toUpperCase() : "",
        path: ro.path,
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
        doEndReporting(true, responseBody, responseHeaders);
        const socket = new Socket({ proto });
        const msg = new IncomingMessage(socket);
        msg.headers = responseHeaders;
        msg.headers["unmock-hash"] = hash;
        msg.statusCode = 200;
        msg.push(responseBody);
        msg.push(null);
        fn(msg);
        process.nextTick(() => {
          output.emit("response", msg);
        });
      } else {
        return protoEnd.apply(output, [chunk, encoding, maybeCallback]);
      }
    };
    return output;
  };
};

export default class NodeBackend implements IBackend {
  public reset() {
    fr.http.request = httpreq;
    http.request = httpreqmod;
    https.request = httpsreq;
    https.request = httpsreqmod;
  }
  public initialize(
    userId: string,
    story: { story: string[] },
    token: string | undefined,
    options: IUnmockInternalOptions,
  ) {
    fr.http.request = mHttp("http", userId, story, token, options, httpreq);
    http.request = mHttp("http", userId, story, token, options, httpreqmod);
    fr.https.request = mHttp("https", userId, story, token, options, httpsreq);
    https.request = mHttp("https", userId, story, token, options, httpsreqmod);
  }
}
