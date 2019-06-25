import jsYaml from "js-yaml";
import { IServiceDef, IServiceDefFile, IServiceParser } from "../interfaces";
import { Service } from "./service";

const patternForKnownFiles = /^(?:index|spec|openapi).ya?ml$/;

export class ServiceParser implements IServiceParser {
  public parse(serviceDef: IServiceDef): Service {
    const serviceFiles = serviceDef.serviceFiles;

    const matchingFiles = serviceFiles.filter(
      (serviceDefFile: IServiceDefFile) =>
        patternForKnownFiles.test(serviceDefFile.basename),
    );

    if (matchingFiles.length === 0) {
      throw new Error(
        `No idea what to do with: ${JSON.stringify(serviceFiles)}`,
      );
    }

    const serviceFile = matchingFiles[0];

    const contents =
      serviceFile.contents instanceof Buffer
        ? serviceFile.contents.toString()
        : serviceFile.contents;

    const schema = jsYaml.safeLoad(contents);

    return new Service(schema);
  }
}
