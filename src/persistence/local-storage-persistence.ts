const UNMOCK = ".unmock";
const AUTH = ".token";
const TOKEN = ".access-token";
const TOKEN_KEY = `${UNMOCK}/${TOKEN}`;
const AUTH_KEY = `${UNMOCK}/${AUTH}`;

export default class LocalStoragePersistence implements IPersistence {
  private token: string | undefined;
  public saveHeaders(hash: string, headers: {[key: string]: string}) {
    window.localStorage[`${this.outdir(hash)}/response-header.json`] = JSON.stringify(headers, null, 2);
  }
  public saveBody(hash: string, body: string) {
    window.localStorage[`${this.outdir(hash)}/response.json`] = JSON.stringify(JSON.parse(body || ""), null, 2);
  }
  public saveAuth(auth: string) {
    window.localStorage[AUTH_KEY] = auth;
  }
  public saveToken(token: string) {
    this.token = token;
  }
  public loadHeaders(hash: string) {
    const out = window.localStorage[`${this.outdir(hash)}/response-header.json`];
    return out ? JSON.parse(out) : {};
  }
  public loadBody(hash: string) {
    return window.localStorage[`${this.outdir(hash)}/response.json`];
  }
  public loadAuth() {
    return window.localStorage[AUTH_KEY];
  }
  public loadToken() {
    return this.token;
  }
  private outdir(hash: string) {
    const outdir = `.unmock/save/${hash}`;
    return outdir;
  }
}
