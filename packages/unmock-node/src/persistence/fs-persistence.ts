import * as fs from "fs";
import * as ini from "ini";
import * as mkdirp from "mkdirp";
import * as os from "os";
import * as path from "path";
import {
  ILogger,
  IMetaData,
  IPersistence,
  IRequestData,
  IResponseData,
} from "unmock-core";
import {
  CompositeDeserializer,
  CompositeSerializer,
  FormDeserializer,
  FormSerializer,
  JSONDeserializer,
  JSONSerializer,
} from "../serialize";

const UNMOCK_DIR = ".unmock";
const TOKEN_FILE = ".token";
const USERID_FILE = ".userid";
const CONFIG_FILE = "credentials";
const TOKEN_PATH = path.join(UNMOCK_DIR, TOKEN_FILE);
const CONFIG_PATH = path.join(UNMOCK_DIR, CONFIG_FILE);
const USERID_PATH = path.join(UNMOCK_DIR, USERID_FILE);
const SAVE_PATH = path.join(UNMOCK_DIR, "save");
const SECONDARY_CONFIG_PATH = path.join(os.homedir(), UNMOCK_DIR, CONFIG_FILE);
const META_FILE = "meta.json";
const REQUEST_FILE = "request.json";
const RESPONSE_FILE = "response.json";

const saveMaybeCreate = (filepath: string, content: string) => {
  const dir = path.dirname(filepath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
  fs.writeFileSync(filepath, content);
};

const loadOrNone = (filepath: string) => {
  if (!fs.existsSync(path.dirname(filepath))) {
    return;
  }
  return fs.readFileSync(filepath).toString();
};

export default class FSPersistence implements IPersistence {
  private token: string | undefined;

  constructor(
    private logger: ILogger,
    private serializer = new CompositeSerializer(
      new FormSerializer(),
      new JSONSerializer(),
    ),
    private deserializer = new CompositeDeserializer(
      new FormDeserializer(),
      new JSONDeserializer(),
    ),
    private savePath = SAVE_PATH,
  ) {}

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
    saveMaybeCreate(TOKEN_PATH, auth);
  }

  public saveToken(token: string) {
    this.token = token;
  }

  public saveUserId(userId: string) {
    saveMaybeCreate(TOKEN_PATH, userId);
  }

  public loadUserId() {
    return loadOrNone(USERID_PATH);
  }

  public loadAuth() {
    return loadOrNone(TOKEN_PATH);
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
    try {
      // First attempt to load existing data
      const existingData = fs.existsSync(target)
        ? JSON.parse(fs.readFileSync(target, "utf-8"))
        : {};
      // Now add the new data as needed
      const newData = { ...existingData, ...data };
      // And save...
      fs.writeFileSync(
        target,
        JSON.stringify(
          fn === "response.json" ? this.serializer.serialize(newData) : newData,
          null,
          2,
        ),
      );
    } catch (e) {
      this.logger.log(
        `Error converting ${target} to JSON. ${e.message} ${e.stack}`,
      );
      throw e;
    }
  }

  private genericLoad<T>(hash: string, fn: string): T {
    const target = this.outdir(hash, false, fn);
    const parsed = JSON.parse(fs.readFileSync(target, "utf-8"));
    return (fs.existsSync(target)
      ? fn === "response.json"
        ? this.deserializer.deserialize(parsed)
        : parsed
      : {}) as T;
  }
}
