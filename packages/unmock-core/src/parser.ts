import debug from "debug";
import { isLeft } from "fp-ts/lib/Either";
import * as jsYaml from "js-yaml";
import loas3 from "loas3";
import { IServiceDef, IServiceDefFile } from "./interfaces";
import { ServiceCore } from "./service/serviceCore";

const debugLog = debug("unmock:service-parser");

/**
 * Static class for parsing service definitions.
 */
export abstract class ServiceParser {
  /**
   * Parse service definition into a service.
   * @param serviceDef Service definition.
   */
  public static parse(serviceDef: IServiceDef): ServiceCore {
    const serviceFiles = serviceDef.serviceFiles;

    const matchingFiles = serviceFiles.filter(
      (serviceDefFile: IServiceDefFile) =>
        ServiceParser.KNOWN_FILENAMES.test(serviceDefFile.basename),
    );

    if (matchingFiles.length === 0) {
      throw new Error(
        `Cannot find known service specification from: ${JSON.stringify(
          serviceFiles,
        )}`,
      );
    }

    debugLog(
      `Found ${matchingFiles.length} service specifications for folder ${serviceDef.directoryName}`,
    );

    const serviceFile = matchingFiles[0];

    debugLog(`Parsing service specification ${serviceFile.basename}`);

    const contents: string =
      serviceFile.contents instanceof Buffer
        ? serviceFile.contents.toString("utf-8")
        : serviceFile.contents;

    const schema = loas3(jsYaml.safeLoad(contents));
    if (isLeft(schema)) {
      throw new Error(
        [
          "The following errors occured while parsing your loas3 schema",
          ...schema.left.map(i => `  ${i.message}`),
        ].join("\n"),
      );
    }

    // TODO Maybe read from the schema first
    const name = serviceDef.directoryName;

    return new ServiceCore({
      name,
      schema: schema.right,
    });
  }
  private static KNOWN_FILENAMES: RegExp = /^(?:index|spec|openapi)\.ya?ml$/i;
}
