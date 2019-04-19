import { IPersistence } from ".";

export default class FailingPersistence implements IPersistence {
  public saveBody() {
    throw new Error("not implemented");
  }
  public saveHeaders() {
    throw new Error("not implemented");
  }
  public saveAuth() {
    throw new Error("not implemented");
  }
  public saveToken() {
    throw new Error("not implemented");
  }
  public saveMetadata() {
    throw new Error("not implemented");
  }
  public loadHeaders() {
    throw new Error("not implemented");
  }
  public loadBody() {
    throw new Error("not implemented");
  }
  public loadAuth() {
    throw new Error("not implemented");
  }
  public loadToken() {
    throw new Error("not implemented");
  } 
}