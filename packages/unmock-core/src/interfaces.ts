import { ActionsV0 } from "unmock-hash";
import { Mode, UnmockOptions } from "./options";

export interface ILogger {
  log: (message: string) => void;
}
export interface IPersistence {
  saveAuth: (auth: string) => void;
  saveUserId: (userId: string) => void;
  saveToken: (token: string) => void;
  saveMeta: (hash: string, data: IMetaData) => void;
  saveRequest: (hash: string, data: IRequestData) => void;
  saveResponse: (hash: string, data: IResponseData) => void;
  loadAuth: () => string | void;
  loadMeta: (hash: string) => IMetaData;
  loadRequest: (hash: string) => IRequestData;
  loadResponse: (hash: string) => IResponseData;
  loadToken: () => string | void;
  loadUserId: () => string | void;
  hasHash: (hash: string) => boolean;
  getPath: () => string;
}

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

export interface IBackend {
  initialize: (
    userId: string,
    story: { story: string[] },
    token: string | undefined,
    opts: UnmockOptions,
  ) => void;
  reset: () => void;
}

export interface IStories {
  story: string[];
}

export interface IUnmockOptions {
  logger?: ILogger;
  persistence?: IPersistence;
  save?: boolean | string[];
  unmockHost?: string;
  unmockPort?: string;
  ignore?: any;
  actions?: ActionsV0 | ActionsV0[];
  signature?: string;
  token?: string;
  whitelist?: string[] | string;
  useInProduction?: boolean;
  mode?: Mode;
}
