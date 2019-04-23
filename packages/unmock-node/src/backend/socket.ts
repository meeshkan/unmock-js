import { EventEmitter } from "events";
import { Socket } from "net";
import util from "util";

export default class MySocket extends Socket {
  public authorized: boolean = false;
  private totalDelayMs: number;
  private timeoutMs: number | null;
  private ee: EventEmitter;
  public constructor(options: any) {
    super();
    if (options.proto === "https") {
      // https://github.com/nock/nock/issues/158
      this.authorized = true;
    }

    this.writable = true;
    this.readable = true;
    this.ee = new EventEmitter();

    // totalDelay that has already been applied to the current
    // request/connection, timeout error will be generated if
    // it is timed-out.
    this.totalDelayMs = 0;
    // Maximum allowed delay. Null means unlimited.
    this.timeoutMs = null;
  }
  public setNoDelay() {
    return this;
  }
  public setKeepAlive() {
    return this;
  }
  public resume() {
    return this;
  }
  public setTimeout(timeoutMs: number, fn: () => void) {
    this.timeoutMs = timeoutMs;
    if (fn) {
      this.ee.once("timeout", fn);
    }
    return this;
  }
  public applyDelay(delayMs: number) {
    this.totalDelayMs += delayMs;
    if (this.timeoutMs && this.totalDelayMs > this.timeoutMs) {
      this.ee.emit("timeout");
    }
  }
  public getPeerCertificate() {
    return Buffer.from((Math.random() * 10000 + Date.now()).toString()).toString(
      "base64",
    );
  }
  public destroy() {
    // this.destroyed = true;
    this.readable = this.writable = false;
  }
}
