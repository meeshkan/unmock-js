import querystring from "querystring";
import logger from "./logger";

export const hostIsWhitelisted =
  (whitelist: string[] | undefined, host: string | undefined, hostname: string | undefined) =>
    whitelist &&
      ((host && whitelist.indexOf(host) !== -1)
        || (hostname && whitelist.indexOf(hostname) !== -1));

export const buildPath =
  (
    headerz: any,
    host: string | undefined,
    hostname: string | undefined,
    ignore: any,
    method: string | undefined,
    path: string | undefined,
    story: string[],
    unmockHost: string) =>
  // tslint:disable-next-line:max-line-length
  (hostname === unmockHost) || (host === unmockHost) ? path : `/x/?story=${querystring.escape(JSON.stringify(story))}&path=${querystring.escape(path || "")}&hostname=${querystring.escape(hostname || host || "")}&method=${querystring.escape(method || "")}&headers=${querystring.escape(JSON.stringify(headerz))}${ignore ? `&ignore=${querystring.escape(JSON.stringify(ignore))}` : ""}`;

export const endReporter = (
  body: string | undefined,
  data: {} | null,
  headers: any,
  host: string | undefined,
  hostname: string | undefined,
  method: string | undefined,
  path: string | undefined,
  save: boolean | string[],
  saveCb: (body: string | undefined, hash: string, headers: any) => void,
  selfcall: boolean,
  story: string[]) => {
  if (!selfcall) {
    const hash = headers["unmock-hash"] as string || "null";
    // in case the end function has been called multiple times
    // we skip invoking it again
    if (story.indexOf(hash) === -1) {
      story.unshift(hash);
      logger.log({
        level: "unmock",
        message: `*****url-called*****`,
      });
      logger.log({
        level: "unmock",
        // tslint:disable-next-line:max-line-length
        message: `Hi! We see you've called ${method} ${hostname || host}${path}${data ? ` with data ${data}.` : `.`}`,
      });
      logger.log({
        level: "unmock",
        // tslint:disable-next-line:max-line-length
        message: `We've sent you mock data back. You can edit your mock at https://unmock.io/x/${hash}. 🚀`,
      });
      if ((typeof save === "boolean" && save) ||
          (typeof save !== "boolean" && save.indexOf(hash) >= 0)) {
        saveCb(body, hash, headers);
      }
    }
  }
};
