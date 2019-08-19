import { SinonSpy, spy as sinonSpy } from "sinon";
import { ISerializedRequest, ISerializedResponse } from "../../interfaces";
// import { IService } from "../interfaces";

export type RequestResponseSpy = SinonSpy<
  [ISerializedRequest],
  ISerializedResponse
>;

interface ISpyable {
  spy: RequestResponseSpy;
  notify(req: ISerializedRequest, res: ISerializedResponse): void;
}

export class SpyContainer {
  public readonly spy: RequestResponseSpy;
  private response?: ISerializedResponse;
  constructor() {
    // @ts-ignore
    this.spy = sinonSpy(this, "gen");
  }

  public notify(sreq: ISerializedRequest, sres: ISerializedResponse) {
    this.response = sres;
    this.gen(sreq);
    this.response = undefined;
  }

  protected gen(_: ISerializedRequest): ISerializedResponse {
    return this.response!;
  }
}

export const get = (): ISpyable => new SpyContainer();

export const attach = <T>(service: T): T & ISpyable => {
  const spyObj2 = new SpyContainer();
  // const fakeObj = new FakeSpied();
  return Object.assign(service, spyObj2);
};
