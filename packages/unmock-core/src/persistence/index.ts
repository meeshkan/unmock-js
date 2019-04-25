import { IMetaData, IRequestData, IResponseData } from "../util";

export interface IPersistence {
  saveAuth: (auth: string) => void;
  saveToken: (token: string) => void;
  saveMeta: (hash: string, data: IMetaData) => void;
  saveRequest: (hash: string, data: IRequestData) => void;
  saveResponse: (hash: string, data: IResponseData) => void;
  loadAuth: () => string | void;
  loadMeta: (hash: string) => IMetaData;
  loadRequest: (hash: string) => IRequestData;
  loadResponse: (hash: string) => IResponseData;
  loadToken: () => string | void;
  hasHash: (hash: string) => boolean;
}
