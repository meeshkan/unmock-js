import { OpenAPIObject } from "loas3/dist/generated/full";
import { ISerializedRequest } from "../interfaces";
import {
  IService,
  IServiceCore,
} from "./interfaces";
import { ServiceSpy } from "./spy";

export class Service implements IService {
  public readonly spy: ServiceSpy;
  constructor(private readonly core: IServiceCore) {
    this.spy = core.spy;
  }

  public state(i: (req: ISerializedRequest, o: OpenAPIObject) => OpenAPIObject): void {
    this.core.transformer = i;
  }

  public reset(): void {
    this.spy.resetHistory();
    this.core.transformer = (_, b) => b;
  }
}
