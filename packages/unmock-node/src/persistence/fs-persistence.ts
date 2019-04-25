import * as fs from "fs";
import * as ini from "ini";
import * as mkdirp from "mkdirp";
import * as os from "os";
import * as path from "path";
import {
  IMetaData,
  IPersistence,
  IRequestData,
  IResponseData,
} from "unmock-core";

const UNMOCK_DIR = ".unmock";
const TOKEN_FILE = ".token";
const CONFIG_FILE = "credentials";
const TOKEN_PATH = path.join(UNMOCK_DIR, TOKEN_FILE);
const CONFIG_PATH = path.join(UNMOCK_DIR, CONFIG_FILE);
const SAVE_PATH = path.join(UNMOCK_DIR, "save");
const SECONDARY_CONFIG_PATH = path.join(os.homedir(), UNMOCK_DIR, CONFIG_FILE);
const META_FILE = "meta.json";
const REQUEST_FILE = "request.json";
const RESPONSE_FILE = "response.json";

export default class FSPersistence implements IPersistence {
  private token: string | undefined;

  constructor(private savePath = SAVE_PATH) {}

  public saveMeta(hash: string, data: IMetaData) {
    this.genericSave<IMetaData>(hash, META_FILE, data);
  }

  public saveRequest(hash: string, data: IRequestData) {
    this.genericSave<IRequestData>(hash, REQUEST_FILE, data);
  }

  public saveResponse(hash: string, data: IResponseData) {
    this.genericSave<IResponseData>(hash, RESPONSE_FILE, data);
  }

  public saveAuth(auth: string) {
    if (!fs.existsSync(UNMOCK_DIR)) {
      fs.mkdirSync(UNMOCK_DIR);
    }
    fs.writeFileSync(TOKEN_PATH, auth);
  }

  public saveToken(token: string) {
    this.token = token;
  }

  public loadAuth() {
    if (!fs.existsSync(TOKEN_PATH)) {
      return;
    }
    return fs.readFileSync(TOKEN_PATH).toString();
  }

  public hasHash(hash: string) {
    const target = this.outdir(hash, false);
    return fs.existsSync(target);
  }

  public loadMeta(hash: string) {
    return this.genericLoad<IMetaData>(hash, META_FILE);
  }

  public loadRequest(hash: string) {
    return this.genericLoad<IRequestData>(hash, REQUEST_FILE);
  }

  public loadResponse(hash: string) {
    return this.genericLoad<IResponseData>(hash, RESPONSE_FILE);
  }

  public loadToken() {
    if (this.token) {
      return this.token;
    }
    let configPath = CONFIG_PATH;
    if (!fs.existsSync(configPath)) {
      configPath = SECONDARY_CONFIG_PATH;
      if (!fs.existsSync(configPath)) {
        return;
      }
    }
    const config = ini.parse(fs.readFileSync(configPath, "utf-8"));
    return config.unmock.token;
  }

  private outdir(hash: string, mkd: boolean, ...args: string[]) {
    const outdir = path.normalize(path.join(this.savePath, hash));
    if (mkd) {
      mkdirp.sync(outdir);
    }
    return path.join(outdir, ...args);
  }

  private genericSave<T>(hash: string, fn: string, data: T) {
    const target = this.outdir(hash, true, fn);
    // First attempt to load existing data
    const existingData = fs.existsSync(target)
      ? JSON.parse(fs.readFileSync(target, "utf-8"))
      : {};
    // Now add the new data as needed
    const newData = { ...existingData, ...data };
    // And save...
    fs.writeFileSync(target, JSON.stringify(newData, null, 2));
  }

  private genericLoad<T>(hash: string, fn: string): T {
    const target = this.outdir(hash, false, fn);
    return (fs.existsSync(target)
      ? JSON.parse(fs.readFileSync(target, "utf-8"))
      : {}) as T;
  }
}
