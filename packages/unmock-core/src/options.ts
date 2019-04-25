import { IBackend } from "./backend";
import { ILogger } from "./logger";
import { IPersistence } from "./persistence";

export enum Mode {
  ALWAYS_CALL_UNMOCK,
  CALL_UNMOCK_FOR_NEW_MOCKS,
  DO_NOT_CALL_UNMOCK,
}

export interface IUnmockInternalOptions {
  backend: IBackend;
  logger: ILogger;
  persistence: IPersistence;
  save: boolean | string[];
  unmockHost: string;
  unmockPort: string;
  useInProduction: boolean;
  mode: Mode;
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
  mode?: Mode;
}
