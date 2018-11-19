import crypto from "crypto";
import fr from "follow-redirects";
import fs from "fs";
import http, { ClientRequest, IncomingMessage, RequestOptions } from "http";
import https from "https";
import querystring from "querystring";
import { URL } from "url";
import winston, { query } from "winston";

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

interface IUnmockOptions {
  verbose: boolean;
  save: string[];
  use: string[];
}

winston.addColors({ unmock: "cyan bold" });
const mHttp = (story: {story: string}, options: IUnmockOptions, cb: {
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
      let hasHash = false;
      let responseData: Buffer | null = null;
      const save = options.save;
      const ro = first as RequestOptions;
      // tslint:disable-next-line:max-line-length
      const path = `story=${story.story}&path=${querystring.escape(ro.path || "")}&hostname=${querystring.escape(ro.hostname || "")}&method=${querystring.escape(ro.method || "")}&headers=${querystring.escape(JSON.stringify(ro.headers))}`;
      const hash = crypto
        .createHash("sha256")
        .update(ro.hostname === "localhost" ? ro.path || "" : path).digest("hex").substr(0, 8);
      if (ro.hostname === "localhost") {
        devnull = true;
      } else {
        // tell the story
        story.story = story.story + (story.story.length > 0 ? "|" : "") + hash;
      }
      const fake = {
        ...ro,
        hostname: "localhost",
        path: ro.hostname === "localhost" ? ro.path : `/x/${hash}/?${path}`,
        port: 3000,
      };
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
              hasHash = res.headers["unmock-hashash"] && res.headers["unmock-hashash"] === "true" ? true : false;
              if (!devnull && (!hasHash || options.verbose)) {
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
                  message: `We're sending you mock data back. You can edit your mock at https://unmock/${hash}. 🚀`,
                });
                logger.log({
                  level: "unmock",
                  // tslint:disable-next-line:max-line-length
                  message: `To save your mock locally, call unmock({save : ["${hash}"]}). Don't forget to check it into version control!`,
                });
                logger.log({
                  level: "unmock",
                  message: `To use your mock locally, call unmock({use : ["${hash}"]}).`,
                });
                logger.log({
                  level: "unmock",
                  message: `To see this message again, call unmock({verbose : true}).`,
                });
              }
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
              f(d);
            }]);
          }
          return protoOn.apply(res, [s, f]);
        };
        (second as ((res: IncomingMessage) => void))(res);
      };
      const output = cb(fake, devnull ? (second as ((res: IncomingMessage) => void)) : resp);
      const protoWrite = output.write;
      output.write = (d: Buffer, q?: any, z?: any) => {
        data = d;
        return protoWrite.apply(output, [d, q, z]);
      };
      return output;
  };
};

const defaultOptions = {
  save: [],
  use: [],
  verbose: false,
};

export default (fakeOptions?: any) => {
  const options = fakeOptions ? { ...defaultOptions, ...fakeOptions } : defaultOptions;
  const story = {
    story: "",
  };
  const httpreq = fr.http.request;
  fr.http.request = mHttp(story, options, httpreq);
  const httpsreq = fr.https.request;
  fr.https.request = mHttp(story, options, httpsreq);
  return true;
};
