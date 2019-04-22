import * as fs from "fs";
import * as ini from "ini";
import * as yml from "js-yaml";
import * as mkdirp from "mkdirp";
import * as os from "os";
import * as path from "path";
import { IPersistableData, IPersistence } from "unmock-core";

const UNMOCK_DIR = ".unmock";
const TOKEN_FILE = ".token";
const CONFIG_FILE = "credentials";
const TOKEN_PATH = path.join(UNMOCK_DIR, TOKEN_FILE);
const CONFIG_PATH = path.join(UNMOCK_DIR, CONFIG_FILE);
const SAVE_PATH = path.join(UNMOCK_DIR, "save");
const SECONDARY_CONFIG_PATH = path.join(os.homedir(), UNMOCK_DIR, CONFIG_FILE);
const UNMOCK_FILE = "unmock.yml";

export default class FSPersistence implements IPersistence {
  private token: string | undefined;

  constructor(private savePath = SAVE_PATH) {}

  public saveMock(hash: string, data: IPersistableData) {
    const target = this.outdir(hash, true, UNMOCK_FILE);
    // First attempt to load existing data
    const existingData = fs.existsSync(target)
      ? yml.safeLoad(fs.readFileSync(target, "utf-8"))
      : {};
    // Now add the new data as needed
    const newData = { ...existingData, ...data };
    // And save...
    fs.writeFileSync(target, yml.safeDump(newData, { indent: 2 }));
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
    const target = this.outdir(hash, false, UNMOCK_FILE);
    return fs.existsSync(target);
  }

  public loadMock(hash: string) {
    const target = this.outdir(hash, false, UNMOCK_FILE);
    return fs.existsSync(target)
      ? yml.safeLoad(fs.readFileSync(target, "utf-8"))
      : {};
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
    if (mkd) { mkdirp.sync(outdir); }
    return path.join(outdir, ...args);
  }

}
