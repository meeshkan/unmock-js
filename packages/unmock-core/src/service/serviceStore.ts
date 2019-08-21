import { IServiceCore, ServiceStoreType } from "./interfaces";
import { Service } from "./service";

export const ServiceStore = (coreServices: IServiceCore[]): ServiceStoreType =>
  coreServices.reduce(
    (o, core) => ({ ...o, [core.name]: new Service(core) }),
    {},
  );
