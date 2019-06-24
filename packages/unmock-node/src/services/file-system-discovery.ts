import debug from "debug";
import fs from "fs";
import path from "path";

const UNMOCK_DIRECTORY = "__unmock__";

export interface IFileSystemServiceDiscovererOptions {
  servicesDir?: string;
}

export interface IService {
  name: string;
}

export interface IServiceDiscoverer {
  services(): Promise<IService[]>;
}

export type ServiceSpecification = any;

// export type ServiceFileStructure = { index: string; openapi?: string };

export type ServiceParser = (spec: string) => ServiceSpecification;

const debugLog = debug("unmock:file-system-store");

export class FileSystemServiceDiscoverer implements IServiceDiscoverer {
  private readonly servicesDirOpt?: string;
  private readonly createDirectories: boolean;
  // private serviceParser: ServiceParser;
  public constructor(options: IFileSystemServiceDiscovererOptions) {
    this.servicesDirOpt = (options && options.servicesDir) || undefined;
    // this.serviceParser = serviceParser;
    this.createDirectories = false;
  }

  public async services(): Promise<IService[]> {
    const servicesDirectory: string = this.servicesDirectory;
    // TODO
    // 1. List all directories
    // 2. Read all index.yaml files
    // 3. Parse using service parser

    return [];
  }

  /**
   * Resolve the absolute path to the directory where services live, with the flow:
   * 1. Injected directory
   * 2. Environment variable
   * 3. ${process.cwd()}/__unmock__
   */
  public get servicesDirectory() {
    const servicesDirectory = path.resolve(
      this.servicesDirOpt ||
        process.env.UNMOCK_SERVICES_DIRECTORY ||
        path.join(process.cwd(), UNMOCK_DIRECTORY),
    );

    debugLog(`Resolved services directory: ${servicesDirectory}`);
    if (fs.existsSync(servicesDirectory)) {
      return servicesDirectory;
    }

    if (!this.createDirectories) {
      throw new Error(`Directory ${servicesDirectory} does not exist`);
    }

    // TODO Create
    throw new Error("Directory creation not implemented");
  }
}
