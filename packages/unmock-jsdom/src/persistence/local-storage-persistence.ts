import * as path from "path";
import { IMetaData, IPersistence, IRequestData, IResponseData } from "unmock-core";

// Uses directory structure for keys in window local storage
const UNMOCK_FILE = ".unmock";
const TOKEN_KEY = ".token";
const TOKEN_FULL_KEY = path.join(UNMOCK_FILE, TOKEN_KEY);
const SAVE_PATH = path.join(UNMOCK_FILE, "save");
const META_FILE = "meta.json";
const REQUEST_FILE = "request.json";
const RESPONSE_FILE = "response.json";

export default class BrowserStoragePersistence implements IPersistence {
  private token: string | undefined;

  constructor(private savePath = SAVE_PATH) {}

  public saveMeta(hash: string, data: IMetaData) {
    this.genericSave(hash, META_FILE, data);
  }

  public saveRequest(hash: string, data: IRequestData) {
    this.genericSave(hash, REQUEST_FILE, data);
  }

  public saveResponse(hash: string, data: IResponseData) {
    this.genericSave(hash, RESPONSE_FILE, data);
  }

  public saveAuth(auth: string) {
    window.localStorage[TOKEN_FULL_KEY] = auth;
  }

  public saveToken(token: string) {
    // we never save the token to the browser only ever in memory
    this.token = token;
  }

  public loadAuth() {
    return window.localStorage[TOKEN_FULL_KEY];
  }

  public loadMeta(hash: string): IMetaData {
    return this.genericLoad(hash, META_FILE);
  }

  public loadRequest(hash: string): IRequestData {
    return this.genericLoad(hash, REQUEST_FILE);
  }

  public loadResponse(hash: string): IResponseData {
    return this.genericLoad(hash, RESPONSE_FILE);
  }

  public hasHash(hash: string): boolean {
    const target = this.outdir(hash);
    // First attempt to load existing data
    return window.localStorage[target] ? true : false;
  }

  public loadToken() {
    return this.token;
  }

  private outdir(hash: string, ...args: string[]) {
    const outdir = path.normalize(path.join(this.savePath, hash));
    return path.join(outdir, ...args);
  }

  private genericSave<T>(hash: string, fn: string, data: T) {
    const target = this.outdir(hash, fn);
    // First attempt to load existing data
    const existingData = window.localStorage[target]
      ? JSON.parse(window.localStorage[target])
      : {};
    // Now add the new data as needed
    const newData = { ...existingData, ...data };
    // And save...
    window.localStorage[target] = JSON.stringify(newData, null, 2);
  }

  private genericLoad<T>(hash: string, fn: string): T {
    const target = this.outdir(hash, fn);
    // First attempt to load existing data
    return window.localStorage[target]
      ? JSON.parse(window.localStorage[target])
      : {};
  }

}
