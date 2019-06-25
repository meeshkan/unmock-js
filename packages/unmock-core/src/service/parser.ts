import jsYaml from "js-yaml";
import { find } from "lodash";
import { IServiceDef, IServiceDefFile, IServiceParser } from "../interfaces";
import { Service } from "./service";

export class ServiceParser implements IServiceParser {
  public parse(serviceDef: IServiceDef): Service {
    const serviceFiles = serviceDef.serviceFiles;

    const yamlServiceFiles = serviceFiles.filter(
      (serviceDefFile: IServiceDefFile) =>
        serviceDefFile.basename.endsWith(".yaml") ||
        serviceDefFile.basename.endsWith(".yml"),
    );

    const serviceFileOrUndef = find(
      yamlServiceFiles,
      (fileForService: IServiceDefFile) =>
        fileForService.basename.startsWith("index") ||
        fileForService.basename.startsWith("openapi"),
    );

    if (serviceFileOrUndef === undefined) {
      throw new Error(
        `No idea what to do with: ${JSON.stringify(serviceFiles)}`,
      );
    }

    const serviceFile = serviceFileOrUndef;

    const contents =
      serviceFile.contents instanceof Buffer
        ? serviceFile.contents.toString()
        : serviceFile.contents;

    const schema = jsYaml.safeLoad(contents);

    return new Service(schema);
  }
}
