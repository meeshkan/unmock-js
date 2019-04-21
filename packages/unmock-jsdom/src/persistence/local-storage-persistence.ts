import * as yml from "js-yaml";
import * as path from "path";
import { IPersistableData, IPersistence } from "unmock-core";

// Uses directory structure for keys in window local storage
const UNMOCK_KEY = ".unmock";
const TOKEN_KEY = ".token";
const TOKEN_FULL_KEY = path.join(UNMOCK_KEY, TOKEN_KEY);
const SAVE_PATH = path.join(UNMOCK_KEY, "save");
const UNMOCK_FILE = "unmock.yml";

export default class BrowserStoragePersistence implements IPersistence {
  private token: string | undefined;

  constructor(private savePath = SAVE_PATH) {}

  public saveMock(hash: string, data: IPersistableData) {
    const target = this.outdir(hash, UNMOCK_FILE);
    // First attempt to load existing data
    const existingData = window.localStorage[target]
      ? yml.safeLoad(window.localStorage[target])
      : {};
    // Now add the new data as needed
    const newData = { ...existingData, ...data };
    // And save...
    window.localStorage[target] = yml.safeDump(newData, { indent: 2 });
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

  public loadMock(hash: string): IPersistableData {
    const target = this.outdir(hash, UNMOCK_FILE);
    // First attempt to load existing data
    return window.localStorage[target]
      ? yml.safeLoad(window.localStorage[target])
      : {};
  }

  public hasHash(hash: string): boolean {
    const target = this.outdir(hash, UNMOCK_FILE);
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

}
