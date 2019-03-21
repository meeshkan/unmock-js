import * as fs from "fs";
import * as ini from "ini";
import * as yml from "js-yaml";
import * as mkdirp from "mkdirp";
import * as path from "path";
import { IPersistence } from "./persistence";

const UNMOCK_DIR = ".unmock";
const TOKEN_FILE = ".token";
const CONFIG_FILE = "credentials";
const TOKEN_PATH = path.join(UNMOCK_DIR, TOKEN_FILE);
const CONFIG_PATH = path.join(UNMOCK_DIR, CONFIG_FILE);
const SAVE_PATH = path.join(UNMOCK_DIR, "save");
const RESPONSE_FILE = "response.json";
const METADATA_FILE = "metadata.unmock.yml";
const DATA_KEY = "body";
const HEADER_KEY = "headers";

export default class FSPersistence implements IPersistence {
  private token: string | undefined;

  constructor(private savePath = SAVE_PATH) {
  }

  public saveMetadata(hash: string, data: {[key: string]: string}) {
    const target = this.outdir(hash, METADATA_FILE);
    // First attempt to load existing data
    const existingData = fs.existsSync(target) ? yml.safeLoad(fs.readFileSync(target, "utf-8")) : {};
    // Now add the new data as needed
    for (const key of Object.keys(data)) {
      existingData[key] = data[key];
    }
    // And save...
    fs.writeFileSync(target, yml.safeDump(existingData, {
      indent: 2,
    }), "utf-8");
  }

  public saveHeaders(hash: string, headers: {[key: string]: string}) {
    this.saveContents(hash, HEADER_KEY, headers);
  }

  public saveBody(hash: string, body: string) {
    this.saveContents(hash, DATA_KEY, body || "");
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

  public loadHeaders(hash: string) {
    return this.loadContents(hash, HEADER_KEY);
  }

  public loadBody(hash: string) {
    return this.loadContents(hash, DATA_KEY);
  }

  public loadAuth() {
    if (!fs.existsSync(TOKEN_PATH)) {
      return;
    }
    return fs.readFileSync(TOKEN_PATH).toString();
  }

  public loadToken() {
    if (this.token) {
      return this.token;
    }
    if (!fs.existsSync(CONFIG_PATH)) {
      return;
    }
    const config = ini.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
    return config.unmock.token;
  }

  private outdir(hash: string, ...args: string[]) {
    const outdir = path.normalize(path.join(this.savePath, hash));
    mkdirp.sync(outdir);
    return path.join(outdir, ...args);
  }

  private loadContents(hash: string, key: string) {
    const contents = this.loadContentOrEmpty(hash);
    if (contents.hasOwnProperty(key)) {
      return contents[key];
    }
    return {};
  }

  private saveContents(hash: string, key: string, data: any) {
    const target = this.outdir(hash, RESPONSE_FILE);
    const contents = this.loadContentOrEmpty(hash);
    contents[key] = data;
    fs.writeFileSync(target, JSON.stringify(contents, null, 2));
  }

  private loadContentOrEmpty(hash: string) {
    const target = this.outdir(hash, RESPONSE_FILE);
    return fs.existsSync(target) ? JSON.parse(fs.readFileSync(target, "utf-8")) : {};
  }
}
