import { IPersistence } from ".";

export default class FailingPersistence implements IPersistence {
  public saveAuth() {
    throw new Error("not implemented");
  }
  public saveToken() {
    throw new Error("not implemented");
  }
  public saveMock() {
    throw new Error("not implemented");
  }
  public loadAuth() {
    throw new Error("not implemented");
  }
  public loadToken() {
    throw new Error("not implemented");
  }
}
