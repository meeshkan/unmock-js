import { IPersistence } from ".";

export default class FailingPersistence implements IPersistence {
  public saveAuth() {
    throw new Error("not implemented");
  }
  public saveMeta() {
    throw new Error("not implemented");
  }
  public saveRequest() {
    throw new Error("not implemented");
  }
  public saveResponse() {
    throw new Error("not implemented");
  }
  public saveToken() {
    throw new Error("not implemented");
  }
  public loadAuth() {
    throw new Error("not implemented");
  }
  public hasHash() {
    throw new Error("not implemented");
    return false;
  }
  public loadMeta() {
    throw new Error("not implemented");
    return {};
  }
  public loadRequest() {
    throw new Error("not implemented");
    return {};
  }
  public loadResponse() {
    throw new Error("not implemented");
    return {};
  }
  public loadToken() {
    throw new Error("not implemented");
  }
}
