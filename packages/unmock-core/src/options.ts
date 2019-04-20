import { IBackend } from "./backend";
import { ILogger } from "./logger";
import { IPersistence } from "./persistence";

export interface IUnmockInternalOptions {
  backend: IBackend;
  logger: ILogger;
  persistence: IPersistence;
  save: boolean | string[];
  unmockHost: string;
  unmockPort: string;
  useInProduction: boolean;
  ignore?: any;
  signature?: string;
  token?: string;
  whitelist?: string[];
}

export interface IUnmockOptions {
  backend?: IBackend;
  logger?: ILogger;
  persistence?: IPersistence;
  save?: boolean | string[];
  unmockHost?: string;
  unmockPort?: string;
  ignore?: any;
  signature?: string;
  token?: string;
  whitelist?: string[];
  useInProduction?: boolean;
}
