import { whitelistToRegex } from "./utils";

export class AllowedHosts {
  constructor(
    private whitelist: Array<string | RegExp> = [
      "127.0.0.1",
      "127.0.0.0",
      "localhost",
    ],
    private regexWhitelist = whitelistToRegex(whitelist),
  ) {}

  public set(urls: Array<string | RegExp> | string | RegExp): void {
    this.whitelist = Array.isArray(urls) ? urls : [urls];
    this.regexWhitelist = whitelistToRegex(this.whitelist);
  }
  public add(urls: string | RegExp | Array<string | RegExp>): void {
    Array.isArray(urls)
      ? this.whitelist.push(...urls)
      : this.whitelist.push(urls);
    this.regexWhitelist = whitelistToRegex(this.whitelist);
  }
  public get() {
    return this.whitelist.map((url: string | RegExp) =>
      url instanceof RegExp ? url.source : url,
    );
  }
  public isWhitelisted(host: string) {
    return this.regexWhitelist.filter(wl => wl.test(host)).length > 0;
  }
}
