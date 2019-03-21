import * as path from "path";
import { IPersistence } from "./persistence";

// Uses directory structure for keys in window local storage
const UNMOCK_KEY = ".unmock";
const TOKEN_KEY = ".token";
const TOKEN_FULL_KEY = path.join(UNMOCK_KEY, TOKEN_KEY);
const SAVE_PATH = path.join(UNMOCK_KEY, "save");
const RESPONSE_FILE = "response.json";
const DATA_KEY = "body";
const HEADER_KEY = "headers";

export default class LocalStoragePersistence implements IPersistence {
  private token: string | undefined;

  constructor(private savePath = SAVE_PATH) {
  }

  public saveHeaders(hash: string, headers: {[key: string]: string}) {
    this.saveContents(hash, HEADER_KEY, headers);
  }

  public saveBody(hash: string, body: string) {
    this.saveContents(hash, DATA_KEY, body || "");
  }

  public saveAuth(auth: string) {
    window.localStorage[TOKEN_FULL_KEY] = auth;
  }

  public saveToken(token: string) {
    // we never save the token to the browser only ever in memory
    this.token = token;
  }

  public loadHeaders(hash: string) {
    return this.loadContents(hash, HEADER_KEY);
  }

  public loadBody(hash: string) {
    return this.loadContents(hash, DATA_KEY);
  }

  public loadAuth() {
    return window.localStorage[TOKEN_FULL_KEY];
  }

  public loadToken() {
    return this.token;
  }

  private outdir(hash: string, ...args: string[]) {
    const outdir = path.normalize(path.join(this.savePath, hash));
    return path.join(outdir, ...args);
  }

  private loadContents(hash: string, key: string) {
    const contents = this.loadContentsOrEmpty(hash);
    if (contents.hasOwnProperty(key)) {
      return contents[key];
    }
    return {};
  }

  private saveContents(hash: string, key: string, data: any) {
    const contents = this.loadContentsOrEmpty(hash);
    const target = this.outdir(hash, RESPONSE_FILE);
    contents[key] = data;
    window.localStorage[target] = JSON.stringify(contents, null, 2);
  }

  private loadContentsOrEmpty(hash: string) {
    const target = this.outdir(hash, RESPONSE_FILE);
    const contents = window.localStorage[target];
    return contents ? JSON.parse(contents) : {};
  }
}
