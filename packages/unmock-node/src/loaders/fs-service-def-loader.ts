import debug from "debug";
import fs from "fs";
import path from "path";

const DEFAULT_SERVICE_SUBDIRECTORY = "__unmock__";

export interface IFsServiceDefLoaderOptions {
  servicesDir?: string;
}

export interface IServiceDefLoader {
  /**
   * Synchronously read service definitions.
   */
  load(): Promise<IServiceDef[]>;
  /**
   * Asynchronously read service definitions.
   */
  loadSync(): IServiceDef[];
}

export interface IServiceDefFile {
  /**
   * Basename for the service definition file: for example, `index.yaml`
   */
  basename: string;
  /**
   * Contents of the service definition file
   */
  contents: string | Buffer;
}

/**
 * Input to the service parser. Contains, e.g., the directory name and all available files.
 */
export interface IServiceDef {
  directoryName: string;
  serviceFiles: IServiceDefFile[];
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
      directoryName: path.basename(absoluteDirectory),
      serviceFiles,
    };
  }
  private readonly servicesDirOpt?: string;

  public constructor(options: IFsServiceDefLoaderOptions) {
    this.servicesDirOpt = (options && options.servicesDir) || undefined;
  }

  public async load(): Promise<IServiceDef[]> {
    return this.loadSync(); // Simple wrap in promise for now
  }

  public loadSync(): IServiceDef[] {
    return this.loadServiceDefs();
  }

  public loadServiceDefs(): IServiceDef[] {
    const servicesDirectory: string = this.servicesDirectory;
    const serviceDirectories = fs
      .readdirSync(servicesDirectory)
      .map((f: string) => path.join(servicesDirectory, f))
      .filter((f: string) => fs.statSync(f).isDirectory());

    debugLog(`Found ${serviceDirectories.length} service directories`);

    const serviceParserInputs = serviceDirectories.map((dir: string) =>
      FsServiceDefLoader.readServiceDirectory(dir),
    );
    return serviceParserInputs;
  }

  /**
   * Resolve the absolute path to the directory where services live, with the flow:
   * 1. Injected directory
   * 2. Environment variable
   * 3. ${process.cwd()}/__unmock__
   */
  private get servicesDirectory() {
    const servicesDirectory = path.resolve(
      this.servicesDirOpt ||
        process.env.UNMOCK_SERVICES_DIRECTORY ||
        path.join(process.cwd(), DEFAULT_SERVICE_SUBDIRECTORY),
    );

    debugLog(`Resolved services directory: ${servicesDirectory}`);
    if (fs.existsSync(servicesDirectory)) {
      return servicesDirectory;
    }

    throw new Error(`Directory ${servicesDirectory} does not exist`);
  }
}
