import { ILogger } from "./logger/logger";
import { IPersistence } from "./persistence/persistence";

export interface IPersistableData {
  lang?: string;
  requestHeaders?: any;
  requestHost?: string;
  requestMethod?: string;
  requestPath?: string;
}

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
    signature: string | undefined,
    story: string[],
    unmockHost: string,
    xy: boolean,
    querystring: { escape: (s: string) => string }) =>
  // tslint:disable-next-line:max-line-length
  (hostname === unmockHost) || (host === unmockHost) ? path : `/${xy ? "x" : "y"}/?story=${querystring.escape(JSON.stringify(story))}&path=${querystring.escape(path || "")}&hostname=${querystring.escape(hostname || host || "")}&method=${querystring.escape(method || "")}&headers=${querystring.escape(JSON.stringify(headerz))}${ignore ? `&ignore=${querystring.escape(JSON.stringify(ignore))}` : ""}${signature ? `&signature=${querystring.escape(signature)}` : ""}`;

export const endReporter = (
    body: string | undefined,
    data: {} | null,
    headers: any,
    host: string | undefined,
    hostname: string | undefined,
    logger: ILogger,
    method: string | undefined,
    path: string | undefined,
    persistence: IPersistence,
    save: boolean | string[],
    selfcall: boolean,
    story: string[],
    xy: boolean,
    unmockUAHeaderValue: () => string,
    persistableData?: IPersistableData) => {
  if (!selfcall) {
    const hash = headers["unmock-hash"] as string || "null";
    // in case the end function has been called multiple times
    // we skip invoking it again
    if (story.indexOf(hash) === -1) {
      story.unshift(hash);
      logger.log(`*****url-called*****`);
      // tslint:disable-next-line:max-line-length
      logger.log(`Hi! We see you've called ${method} ${hostname || host}${path}${data ? ` with data ${data}.` : `.`}`);
      // tslint:disable-next-line:max-line-length
      logger.log(`We've sent you mock data back. You can edit your mock at https://unmock.io/${xy ? "x" : "y"}/${hash}. 🚀`);
      if ((typeof save === "boolean" && save) ||
          (typeof save !== "boolean" && save.indexOf(hash) >= 0)) {
        persistence.saveHeaders(hash, headers);
        if (persistableData !== undefined) {
          persistence.saveMetadata(hash, persistableData);
        }
        persistence.saveMetadata(hash, {lang: unmockUAHeaderValue()});
        if (body) {
          persistence.saveBody(hash, body);
        }
      }
    }
  }
};

export const UNMOCK_UA_HEADER_NAME = "X-Unmock-Client-User-Agent";
