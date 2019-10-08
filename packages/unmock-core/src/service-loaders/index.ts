import debug from "debug";
import * as _ from "lodash";
import { FsServiceDefLoader } from "../fs-service-def-loader";
import { IServiceDef } from "../interfaces";
import { resolveUnmockDirectories } from "../utils";

const debugLog = debug("unmock:node");

export interface IServiceDefLoader {
  loadSync(): IServiceDef[];
}

const createServiceDefLoader = (servicesDirectory?: string) => {
  const unmockDirectories = servicesDirectory
    ? [servicesDirectory]
    : resolveUnmockDirectories();

  debugLog(`Found unmock directories: ${JSON.stringify(unmockDirectories)}`);
  return new FsServiceDefLoader({ unmockDirectories });
};

export default createServiceDefLoader;
