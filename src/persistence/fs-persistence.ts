import * as fs from "fs";
import * as ini from "ini";
import * as mkdirp from "mkdirp";

const UNMOCK_DIR = ".unmock";
const TOKEN_FILE = ".token";
const CONFIG_FILE = "credentials";
const TOKEN_PATH = `${UNMOCK_DIR}/${TOKEN_FILE}`;
const CONFIG_PATH = `${UNMOCK_DIR}/${CONFIG_FILE}`;

export default class FSPersistence implements IPersistence {
  private token: string | undefined;
  public saveHeaders(hash: string, headers: {[key: string]: string}) {
    fs.writeFileSync(`${this.outdir(hash)}/response-header.json`, JSON.stringify(headers, null, 2));  }
  public saveBody(hash: string, body: string) {
    fs.writeFileSync(`${this.outdir(hash)}/response.json`, JSON.stringify(JSON.parse(body || ""), null, 2));
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
    if (!fs.existsSync(`${this.outdir(hash)}/response-header.json`)) {
      return {};
    }
    return JSON.parse(fs.readFileSync(`${this.outdir(hash)}/response-header.json`).toString());
  }
  public loadBody(hash: string) {
    if (!fs.existsSync(`${this.outdir(hash)}/response.json`)) {
      return;
    }
    return fs.readFileSync(`${this.outdir(hash)}/response.json`).toString();
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
  private outdir(hash: string) {
    const outdir = `.unmock/save/${hash}`;
    mkdirp.sync(outdir);
    return outdir;
  }
}
