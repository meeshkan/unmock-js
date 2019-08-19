import { SinonSpy, spy as sinonSpy } from "sinon";
import { ISerializedRequest, ISerializedResponse } from "../../interfaces";
import { IService } from "../interfaces";

export type RequestResponseSpy = SinonSpy<
  [ISerializedRequest],
  ISerializedResponse
>;

export interface ISpyable {
  spy: RequestResponseSpy;
  notify(req: ISerializedRequest, res: ISerializedResponse): void;
}

class SpyContainer {
  public readonly spy: RequestResponseSpy;
  private response?: ISerializedResponse;
  constructor() {
    // @ts-ignore
    this.spy = sinonSpy(this, "gen");
  }

  public notify(sreq: ISerializedRequest, sres: ISerializedResponse) {
    // Ugly hack to predefine what the spied function should return
    this.response = sres;
    this.gen(sreq);
    this.response = undefined;
  }

  private gen(_: ISerializedRequest): ISerializedResponse {
    return this.response!;
  }
}

export const createRequestResponseSpy = (): ISpyable => new SpyContainer();

export const attach = (service: IService): IService & ISpyable => {
  const spyable = new SpyContainer();
  return Object.assign(service, spyable);
};
