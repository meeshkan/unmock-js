import axios from "axios";
import querystring from "querystring";
import { IMetaData, IRequestData, IResponseData } from "./interfaces";
import { UnmockOptions } from "./options";

const inputOrEmptyString = (inp: string | undefined) => inp || "";

export const makeAuthHeader = (token: string) => ({
  headers: { Authorization: `Bearer ${token}` },
});

export const getUserId = async (opts: UnmockOptions, accessToken: string) => {
  const {
    data: { userId },
  } = await axios.get(opts.buildPath("user"), makeAuthHeader(accessToken));
  return userId;
};

export const buildPath = (
  opts: UnmockOptions,
  headers: any,
  hostname: string | undefined,
  method: string | undefined,
  path: string | undefined,
  story: string[],
  xy: boolean,
) => {
  hostname = inputOrEmptyString(hostname);
  path = inputOrEmptyString(path);
  method = inputOrEmptyString(method);
  if (hostname === opts.unmockHost) {
    return path;
  }
  const { ignore, signature } = opts;
  const queryObject = {
    headers: JSON.stringify(headers),
    hostname,
    ...(ignore ? { ignore: JSON.stringify(ignore) } : {}),
    method,
    path,
    story: JSON.stringify(story),
    ...(signature ? { signature } : {}),
  };
  return `/${xy ? "x" : "y"}/?${querystring.stringify(queryObject)}`;
};

export const endReporter = (
  opts: UnmockOptions,
  hash: string,
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
  const { logger, save, persistence } = opts;
  const { method, host, path, body } = requestData;
  logger.log(`*****url-called*****`);
  // tslint:disable-next-line:max-line-length
  logger.log(
    `Hi! We see you've called ${method} ${host}${path}${
      body ? ` with data ${body}.` : `.`
    }`,
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
