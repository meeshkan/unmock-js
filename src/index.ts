import debug from "debug";
import fr from "follow-redirects";
import fs from "fs";
import http, { ClientRequest, IncomingMessage, RequestOptions } from "http";
import https from "https";
import querystring from "querystring";
import { URL } from "url";
import winston from "winston";
import ax from "./axios";
import getToken from "./token";
import { IUnmockInternalOptions, IUnmockOptions } from "./unmock-options";

const logger = winston.createLogger({
  levels: { unmock: 2},
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
         winston.format.simple(),
      ),
      level: "unmock",
    }),
  ],
});

winston.addColors({ unmock: "cyan bold" });
const mHttp = (
  story: {story: string[]},
  token: string,
  { unmockHost, unmockPort, save, ignore, whitelist }: IUnmockInternalOptions, cb: {
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
      let responseData: Buffer | null = null;
      const ro = (first instanceof URL || typeof first === "string" ? second : first) as RequestOptions;
      if (whitelist &&
        ((ro.host && whitelist.indexOf(ro.host) !== -1)
          || (ro.hostname && whitelist.indexOf(ro.hostname) !== -1))) {
        // TODO
        // we know this will work because this is the original signature, but is there
        // a better way to make this typesafe?
        return cb(first as any, second as any, third as any);
      }
      // tslint:disable-next-line:max-line-length
      const path = `story=${querystring.escape(JSON.stringify(story.story))}&path=${querystring.escape(ro.path || "")}&hostname=${querystring.escape(ro.hostname || ro.host || "")}&method=${querystring.escape(ro.method || "")}&headers=${querystring.escape(JSON.stringify(ro.headers))}${ignore ? `&ignore=${querystring.escape(JSON.stringify(ignore))}` : ""}`;
      const pathForFake = (ro.hostname === unmockHost) || (ro.host === unmockHost) ? ro.path : `/x/?${path}`;
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
              responseData = d;
              f(d);
            }]);
          }
          if (s === "end") {
            return protoOn.apply(res, [s, (d: any) => {
              if (!selfcall) {
                const hash = res.headers["unmock-hash"] as string || "null";
                // in case the end function has been called multiple times
                // we skip invoking it again
                if (story.story.indexOf(hash) === -1) {
                  story.story.unshift(hash);
                  logger.log({
                    level: "unmock",
                    message: `*****url-called*****`,
                  });
                  logger.log({
                    level: "unmock",
                    // tslint:disable-next-line:max-line-length
                    message: `Hi! We see you've called ${ro.method} ${ro.hostname || ro.host}${ro.path}${data ? ` with data ${data}.` : `.`}`,
                  });
                  logger.log({
                    level: "unmock",
                    // tslint:disable-next-line:max-line-length
                    message: `We've sent you mock data back. You can edit your mock at https://unmock.io/x/${hash}. 🚀`,
                  });
                  if ((typeof save === "boolean" && save) ||
                      (typeof save !== "boolean" && save.indexOf(hash) >= 0)) {
                    try {
                      fs.mkdirSync(".unmock");
                    } catch (e) {
                      // directory already exists nothing
                    }
                    // tslint:disable-next-line:max-line-length
                    fs.writeFileSync(".unmock/.unmock_" + hash, JSON.stringify(JSON.parse((responseData as Buffer).toString()), null, 2));
                    logger.log({
                      level: "unmock",
                      message: `Saving ${hash} to .unmock_${hash}`,
                    });
                  }
                }
              }
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

const defaultOptions: IUnmockInternalOptions = {
  save: false,
  unmockHost: "api.unmock.io",
  unmockPort: "443",
  whitelist: ["127.0.0.1", "127.0.0.0", "localhost"],
};

export const axios = ax;

let httpreq: any;
let httpreqmod: any;
let httpsreq: any;
let httpsreqmod: any;

export const unmock = async (fakeOptions?: IUnmockOptions) => {
  const options = fakeOptions ? { ...defaultOptions, ...fakeOptions } : defaultOptions;
  const story = {
    story: [],
  };
  const token = await getToken(options);
  httpreq = fr.http.request;
  fr.http.request = mHttp(story, token, options, httpreq);
  httpreqmod = http.request;
  http.request = mHttp(story, token, options, httpreqmod);
  httpsreq = fr.https.request;
  fr.https.request = mHttp(story, token, options, httpsreq);
  httpsreqmod = https.request;
  https.request = mHttp(story, token, options, httpsreqmod);
  return true;
};

export const kcomnu = () => {
  if (httpreq) {
    fr.http.request = httpreq;
  }
  if (httpreqmod) {
    http.request = httpreqmod;
  }
  if (httpsreq) {
    https.request = httpsreq;
  }
  if (httpsreqmod) {
    https.request = httpsreqmod;
  }
};

export const unmockDev = async (fakeOptions?: IUnmockOptions) => {
  if (process.env.NODE_ENV !== "production") {
    const devOptions = { ...{ ignore: "story"}, ...defaultOptions };
    const options = fakeOptions
      ? { ...devOptions, ...fakeOptions }
      : devOptions;
    await unmock(options);
  }
};
