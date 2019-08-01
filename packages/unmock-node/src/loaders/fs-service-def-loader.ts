import debug from "debug";
import fs from "fs";
import path from "path";
import { IServiceDef, IServiceDefLoader } from "unmock-core";
import { resolveServicesDirectory } from "../utils";

export interface IFsServiceDefLoaderOptions {
  servicesDir?: string;
}

const debugLog = debug("unmock:fs-service-def-loader");

/**
 * Read services from file system. Base directory is either
 * 1. Directory injected in configuration
 * 2. Environment variable `UNMOCK_SERVICES_DIRECTORY`
 * 3. `${process.cwd()}/__unmock__`
 */
export class FsServiceDefLoader implements IServiceDefLoader {
  /**
   * Read service parser input from directory containing all the files for a given service.
   * @param absoluteDirectory Absolute path to service directory. For example, /path/to/__unmock__/petstore/
   * @returns Input for service parser to parse a service
   */
  public static readServiceDirectory(absoluteDirectory: string): IServiceDef {
    const serviceFiles = fs
      .readdirSync(absoluteDirectory)
      .map((fileName: string) => path.join(absoluteDirectory, fileName))
      .filter((fileName: string) => fs.statSync(fileName).isFile())
      .map((f: string) => ({
        basename: path.basename(f),
        contents: fs.readFileSync(f).toString("utf-8"),
      }));

    return {
      absolutePath: absoluteDirectory,
      directoryName: path.basename(absoluteDirectory),
      serviceFiles,
    };
  }

  private readonly servicesDirectory: string;

  public constructor(options: IFsServiceDefLoaderOptions) {
    this.servicesDirectory = resolveServicesDirectory(options.servicesDir);
  }

  public async load(): Promise<IServiceDef[]> {
    return this.loadSync(); // Simple wrap in promise for now
  }

  public loadSync(): IServiceDef[] {
    const servicesDirectory: string = this.servicesDirectory;
    const serviceDirectories = fs
      .readdirSync(servicesDirectory)
      .map((f: string) => path.join(servicesDirectory, f))
      .filter((f: string) => fs.statSync(f).isDirectory());

    debugLog(`Found ${serviceDirectories.length} service directories`);

    const serviceDefs = serviceDirectories.map((dir: string) =>
      FsServiceDefLoader.readServiceDirectory(dir),
    );
    return serviceDefs;
  }
}
