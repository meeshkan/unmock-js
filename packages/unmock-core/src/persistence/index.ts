import { IPersistableData } from "../util";
export interface IPersistence {
  saveAuth: (auth: string) => void;
  saveToken: (token: string) => void;
  saveMock: (hash: string, data: IPersistableData) => void;
  loadAuth: () => string | void;
  loadToken: () => string | void;
}
