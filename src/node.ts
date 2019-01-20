import debug from "debug";
import fr from "follow-redirects";
import http, { ClientRequest, IncomingMessage, RequestOptions } from "http";
import https from "https";
import { URL } from "url";
import { IUnmockInternalOptions } from "./unmock-options";
import { buildPath, endReporter, hostIsWhitelisted } from "./util";

const httpreq = fr.http.request;
const httpreqmod = http.request;
const httpsreq = fr.https.request;
const httpsreqmod = https.request;

export const reset = () => {
  fr.http.request = httpreq;
  http.request = httpreqmod;
  https.request = httpsreq;
  https.request = httpsreqmod;
};

export const initialize = (story: {story: string[]}, token: string, options: IUnmockInternalOptions) => {
  fr.http.request = mHttp(story, token, options, httpreq);
  http.request = mHttp(story, token, options, httpreqmod);
  fr.https.request = mHttp(story, token, options, httpsreq);
  https.request = mHttp(story, token, options, httpsreqmod);
};

const mHttp = (
  story: {story: string[]},
  token: string,
  { unmockHost, unmockPort, save, saveCallback, ignore, whitelist }: IUnmockInternalOptions, cb: {
    (
        options: string | http.RequestOptions | URL,
        callback?: ((res: http.IncomingMessage) => void) | undefined): http.ClientRequest;
    (
        url: string | URL,
        options: http.RequestOptions,
        callback?: ((res: http.IncomingMessage) => void) | undefined): http.ClientRequest;
  }) => {
  return (
    first: RequestOptions | string | URL,
    second: RequestOptions | ((res: IncomingMessage) => void) | undefined,
    third?: (res: IncomingMessage) => void): ClientRequest => {
      let data: {} | null = null;
      let selfcall = false;
      const responseData: Buffer[] = [];
      const ro = (first instanceof URL || typeof first === "string" ? second : first) as RequestOptions;
      if (hostIsWhitelisted(whitelist, ro.host, ro.hostname)) {
        // TODO
        // we know this will work because this is the original signature, but is there
        // a better way to make this typesafe?
        return cb(first as any, second as any, third as any);
      }
      // tslint:disable-next-line:max-line-length
      const pathForFake = buildPath(ro.headers, ro.host, ro.hostname, ignore, ro.method, ro.path, story.story, unmockHost);
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
      debug("unmock")(`${pathForFake}`);
      if ((ro.hostname === unmockHost) || (ro.host === unmockHost)) {
        // self call, we ignore
        selfcall = true;
      }
      const resp = (res: IncomingMessage) => {
        const protoOn = res.on;
        res.on = (s: string, f: any) => {
          if (s === "data") {
            return protoOn.apply(res, [s, (d: any) => {
              responseData.push(d);
              f(d);
            }]);
          }
          if (s === "end") {
            return protoOn.apply(res, [s, (d: any) => {
              const body = responseData.map((datum) => datum.toString()).join("");
              endReporter(
                body,
                data,
                res.headers,
                ro.host,
                ro.hostname,
                ro.method,
                ro.path,
                save,
                saveCallback,
                selfcall,
                story.story);
              // https://github.com/nodejs/node/blob/master/lib/_http_client.js
              // the original res.on('end') has a closure that refers to this
              // as far as i can understand, 'this' is supposed to refer to res
              f.apply(res, [d]);
            }]);
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
      output.setHeader("Authorization", `Bearer ${token}`);
      const protoWrite = output.write;
      output.write = (d: Buffer, q?: any, z?: any) => {
        data = d;
        return protoWrite.apply(output, [d, q, z]);
      };
      return output;
  };
};
