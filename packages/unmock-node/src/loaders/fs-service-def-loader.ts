import debug from "debug";
import fs from "fs";
import { flatMap } from "lodash";
import path from "path";
import { IServiceDef, IServiceDefLoader } from "unmock-core";

export interface IFsServiceDefLoaderOptions {
  servicesDirectories: string[];
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

  public static loadSyncDirectory(servicesDirectory: string) {
    debugLog(`Reading services from ${servicesDirectory}`);
    if (
      !(
        fs.existsSync(servicesDirectory) &&
        fs.statSync(servicesDirectory).isDirectory()
      )
    ) {
      throw new Error(`Directory ${servicesDirectory} does not exist.`);
    }
    const individualServiceDirectory = fs
      .readdirSync(servicesDirectory)
      .map((f: string) => path.join(servicesDirectory, f))
      .filter((f: string) => fs.statSync(f).isDirectory());
    debugLog(
      `Found ${individualServiceDirectory.length} services in ${servicesDirectory}`,
    );
    const serviceDefs = individualServiceDirectory.map((dir: string) =>
      FsServiceDefLoader.readServiceDirectory(dir),
    );
    return serviceDefs;
  }

  private readonly servicesDirectories: string[];

  public constructor(options: IFsServiceDefLoaderOptions) {
    this.servicesDirectories = options.servicesDirectories;
  }

  public async load(): Promise<IServiceDef[]> {
    return this.loadSync(); // Simple wrap in promise for now
  }

  public loadSync(): IServiceDef[] {
    return flatMap(this.servicesDirectories, (directory: string) =>
      FsServiceDefLoader.loadSyncDirectory(directory),
    );
  }
}
