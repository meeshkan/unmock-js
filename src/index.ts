import fr from "follow-redirects";
import fs from "fs";
import http, { ClientRequest, IncomingMessage, RequestOptions } from "http";
import https from "https";
import querystring from "querystring";
import url, { URL } from "url";
import winston from "winston";
import ax from "./axios";
import getToken from "./token";
import { IUnmockOptions } from "./unmock-options";

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
  { unmockHost, unmockPort, save }: IUnmockOptions, cb: {
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
      let devnull = false;
      let responseData: Buffer | null = null;
      const ro = first as RequestOptions;
      // tslint:disable-next-line:max-line-length
      const path = `story=${JSON.stringify(story.story)}&path=${querystring.escape(ro.path || "")}&hostname=${querystring.escape(ro.hostname || ro.host || "")}&method=${querystring.escape(ro.method || "")}&headers=${querystring.escape(JSON.stringify(ro.headers))}`;
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
      if ((ro.hostname === unmockHost) || (ro.host === unmockHost)) {
        // self call, we ignore
        devnull = true;
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
              if (!devnull) {
                const hash = res.headers["unmock-hash"] as string || "null";
                story.story.unshift(hash);
                logger.log({
                  level: "unmock",
                  message: `*****url-called*****`,
                });
                logger.log({
                  level: "unmock",
                  // tslint:disable-next-line:max-line-length
                  message: `Hi! We see you've called ${ro.method} ${ro.hostname}${ro.path}${data ? ` with data ${data}.` : `.`}`,
                });
                logger.log({
                  level: "unmock",
                  // tslint:disable-next-line:max-line-length
                  message: `We've sent you mock data back. You can edit your mock at https://unmock.io/x/${hash}. 🚀`,
                });
                if (save.indexOf(hash) >= 0) {
                  try {
                    fs.mkdirSync(".unmock");
                  } catch (e) {
                    // do nothing
                  }
                  // tslint:disable-next-line:max-line-length
                  fs.writeFileSync(".unmock/.unmock_" + hash, JSON.stringify(JSON.parse((responseData as Buffer).toString()), null, 2));
                  logger.log({
                    level: "unmock",
                    message: `Saving ${hash} to .unmock_${hash}`,
                  });
                }
              }
              f(d);
            }]);
          }
          return protoOn.apply(res, [s, f]);
        };
        (second as ((res: IncomingMessage) => void))(res);
      };
      const output = cb(fake, devnull ? (second as ((res: IncomingMessage) => void)) : resp);
      output.setHeader("Authorization", `Bearer ${token}`);
      const protoWrite = output.write;
      output.write = (d: Buffer, q?: any, z?: any) => {
        data = d;
        return protoWrite.apply(output, [d, q, z]);
      };
      return output;
  };
};

const defaultOptions: IUnmockOptions = {
  save: [],
  unmockHost: "api.unmock.io",
  unmockPort: "443",
  use: [],
};

export const axios = ax;

let httpreq: any;
let httpreqmod: any;
let httpsreq: any;
let httpsreqmod: any;

export const unmock = async (fakeOptions?: any) => {
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
