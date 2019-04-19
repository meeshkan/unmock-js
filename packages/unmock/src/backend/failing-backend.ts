import { IBackend } from ".";

export default class FailingBackend implements IBackend {
  public initialize() {
    throw new Error("not implemented");
  }
  public reset() {
    throw new Error("not implemented");
  }
  public unmockUAHeaderValue() {
    throw new Error("not implemented");
    return "";
  }
}