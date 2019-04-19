import { ILogger } from "./logger";

export default class FailingLogger implements ILogger {
  public log() {
    throw new Error("not implemented");
  }
}