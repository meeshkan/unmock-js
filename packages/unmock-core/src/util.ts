import axios from "axios";
import querystring from "querystring";
import { IMetaData, IRequestData, IResponseData } from "./interfaces";
import { UnmockOptions } from "./options";

const inputOrEmptyString = (inp: string | undefined) => inp || "";

export const makeAuthHeader = (token: string) => ({
  headers: { Authorization: `Bearer ${token}` },
});

export const getUserId = async (opts: UnmockOptions, accessToken?: string) => {
  if (accessToken === undefined) {
    return null;
  }
  const maybeUserId = opts.persistence.loadUserId();
  if (maybeUserId && accessToken === opts.persistence.loadAuth()) {
    return maybeUserId;
  }
  const {
    data: { userId },
  } = await axios.get(opts.buildPath("user"), makeAuthHeader(accessToken));
  opts.persistence.saveUserId(userId);
  return userId;
};

export const buildPath = (
  opts: UnmockOptions,
  headers: any,
  hostname: string | undefined,
  method: string | undefined,
  path: string | undefined,
  story: string[],
  hash: string | undefined,
  xy: boolean,
) => {
  hostname = inputOrEmptyString(hostname);
  path = inputOrEmptyString(path);
  method = inputOrEmptyString(method);
  if (hostname === opts.unmockHost) {
    return path;
  }
  const { actions, ignore, signature } = opts;
  const queryObject = {
    ...(actions ? { actions: JSON.stringify(actions) } : {}),
    ...(hash ? { hash } : {}),
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
    `We've ${cachemsg} mock data back. You can edit your mock by typing the following command: unmock open ${hash}`,
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
