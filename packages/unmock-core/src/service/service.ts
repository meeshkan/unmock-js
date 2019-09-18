import { OpenAPIObject } from "loas3/dist/generated/full";
import { ISerializedRequest, IStateTransformer } from "../interfaces";
import { IService, IServiceCore } from "./interfaces";
import { ServiceSpy } from "./spy";

export class Service implements IService {
  public readonly spy: ServiceSpy;
  constructor(private readonly core: IServiceCore) {
    this.spy = core.spy;
  }

  public state(a0: IStateTransformer, ...i: IStateTransformer[]): void {
    this.core.transformer = (
      req: ISerializedRequest,
      o: OpenAPIObject
    ): OpenAPIObject => i.reduce((a, b) => b(req, a), a0(req, o));
  }

  public reset(): void {
    this.spy.resetHistory();
    this.core.transformer = (_, b) => b;
  }
}
