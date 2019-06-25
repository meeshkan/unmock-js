import { IServiceDef, IServiceParser } from "../interfaces";
import { Service } from "./service";

export class ServiceParser implements IServiceParser {
  public parse(serviceDef: IServiceDef): Service {
    // const name = serviceDef.directoryName;
    const schema = {};
    return new Service(schema);
  }
}
