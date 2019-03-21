export interface IPersistence {
  saveHeaders: (hash: string, headers: {[key: string]: string}) => void;
  saveBody: (hash: string, body: string) => void;
  saveAuth: (auth: string) => void;
  saveToken: (token: string) => void;
  saveMetadata: (hash: string, data: {[key: string]: string}) => void;
  loadHeaders: (hash: string) => {[key: string]: string} | void;
  loadBody: (hash: string) => string | void;
  loadAuth: () => string | void;
  loadToken: () => string | void;
}
