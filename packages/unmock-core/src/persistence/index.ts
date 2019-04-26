import { IPersistence } from "../interfaces";

export class FailingPersistence implements IPersistence {
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
  public saveUserId() {
    throw new Error("not implemented");
  }
  public loadAuth() {
    throw new Error("not implemented");
  }
  public loadUserId() {
    throw new Error("not implemented");
  }
  public hasHash(): never {
    throw new Error("not implemented");
  }
  public loadMeta(): never {
    throw new Error("not implemented");
  }
  public loadRequest(): never {
    throw new Error("not implemented");
  }
  public loadResponse(): never {
    throw new Error("not implemented");
  }
  public loadToken() {
    throw new Error("not implemented");
  }
}
