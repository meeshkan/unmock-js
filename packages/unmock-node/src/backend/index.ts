import fr from "follow-redirects";
import http, { ClientRequest, IncomingMessage, RequestOptions } from "http";
import https from "https";
import { URL } from "url";
import { IBackend, IUnmockInternalOptions } from "unmock";
import { util } from "unmock";

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

const mHttp = (
  story: { story: string[] },
  token: string | undefined,
  {
    logger,
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
    let data: {} | null = null;
    let selfcall = false;
    const responseData: Buffer[] = [];
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
    // content being written or end of call!
    const resp = (res: IncomingMessage) => {
      const protoOn = res.on;
      res.on = (s: string, f: any) => {
        if (s === "data") {
          return protoOn.apply(res, [
            s,
            (d: any) => {
              responseData.push(d);
              f(d);
            },
          ]);
        }
        if (s === "end") {
          return protoOn.apply(res, [
            s,
            (d: any) => {
              const body = responseData.map(datum => datum.toString()).join("");
              endReporter(
                body,
                data,
                res.headers,
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
                {
                  requestHeaders: ro.headers,
                  requestHost: ro.hostname || ro.host || "",
                  requestMethod: ro.method || "",
                  requestPath: ro.path || "",
                },
              );
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
    const output = cb(
      fake,
      selfcall ? (second as ((res: IncomingMessage) => void)) : resp,
    );
    if (token) {
      output.setHeader("Authorization", `Bearer ${token}`);
    }
    output.setHeader(UNMOCK_UA_HEADER_NAME, JSON.stringify("node"));
    const protoWrite = output.write;
    output.write = (d: Buffer, q?: any, z?: any) => {
      data = d;
      return protoWrite.apply(output, [d, q, z]);
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
    story: { story: string[] },
    token: string | undefined,
    options: IUnmockInternalOptions,
  ) {
    fr.http.request = mHttp(story, token, options, httpreq);
    http.request = mHttp(story, token, options, httpreqmod);
    fr.https.request = mHttp(story, token, options, httpsreq);
    https.request = mHttp(story, token, options, httpsreqmod);
  }
}
