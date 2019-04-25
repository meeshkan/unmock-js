import querystring from "querystring";
import { ILogger } from "./logger";
import { IPersistence } from "./persistence";

export interface IMetaData {
  lang?: string;
}

export interface IRequestData {
  body?: string;
  headers?: any;
  host?: string;
  method?: string;
  path?: string;
}

export interface IResponseData {
  body?: string;
  headers?: any;
}

export const hostIsWhitelisted = (
  whitelist: string[] | undefined,
  host: string | undefined,
  hostname: string | undefined,
) =>
  whitelist &&
  ((host && whitelist.indexOf(host) !== -1) ||
    (hostname && whitelist.indexOf(hostname) !== -1));

export const buildPath = (
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
) =>
  // tslint:disable-next-line:max-line-length
  hostname === unmockHost || host === unmockHost
    ? path
    : `/${xy ? "x" : "y"}/?story=${querystring.escape(
        JSON.stringify(story),
      )}&path=${querystring.escape(path || "")}&hostname=${querystring.escape(
        hostname || host || "",
      )}&method=${querystring.escape(
        method || "",
      )}&headers=${querystring.escape(JSON.stringify(headerz))}${
        ignore ? `&ignore=${querystring.escape(JSON.stringify(ignore))}` : ""
      }${signature ? `&signature=${querystring.escape(signature)}` : ""}`;

export const endReporter = (
  hash: string,
  logger: ILogger,
  persistence: IPersistence,
  save: boolean | string[],
  story: string[],
  xy: boolean,
  fromCache: boolean,
  metaData: IMetaData,
  requestData: IRequestData,
  responseData: IResponseData,
) => {
  // in case the end function has been called multiple times
  // we skip invoking it again
  if (story.indexOf(hash) === -1) {
    story.unshift(hash);
  }
  logger.log(`*****url-called*****`);
  // tslint:disable-next-line:max-line-length
  logger.log(
    `Hi! We see you've called ${requestData.method} ${requestData.host}${
      requestData.path
    }${requestData.body ? ` with data ${requestData.body}.` : `.`}`,
  );
  const cachemsg = fromCache ? "served you cached" : "sent you";
  logger.log(
    `We've ${cachemsg} mock data back. You can edit your mock at https://unmock.io/${
      xy ? "x" : "y"
    }/${hash}. 🚀`,
  );
  if (
    (typeof save === "boolean" && save) ||
    (typeof save !== "boolean" && save.indexOf(hash) >= 0)
  ) {
    persistence.saveMeta(hash, metaData);
    persistence.saveRequest(hash, requestData);
    persistence.saveResponse(hash, responseData);
  }
};

export const UNMOCK_UA_HEADER_NAME = "X-Unmock-Client-User-Agent";
