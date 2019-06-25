import fs from "fs";
import path from "path";
import { IServiceDef } from "../interfaces";
import { ServiceParser } from "../service/parser";

const petStoreYamlString = fs
  .readFileSync(path.join(__dirname, "__unmock__", "petstore", "spec.yaml"))
  .toString("utf-8");

describe("Service parser", () => {
  it("reads a petstore yaml", () => {
    const serviceParser = new ServiceParser();
    const serviceDef: IServiceDef = {
      directoryName: "petstore",
      serviceFiles: [
        {
          basename: "index.yaml",
          contents: petStoreYamlString,
        },
      ],
    };
    const service = serviceParser.parse(serviceDef);
    expect(service).toBeDefined();
    expect(service.schema).toHaveProperty("openapi");
    expect(service.schema).toHaveProperty("info");
    expect(service.schema.openapi).toEqual("3.0.0");
  });

  it("fails for json files", () => {
    const serviceParser = new ServiceParser();
    const serviceDef: IServiceDef = {
      directoryName: "petstore",
      serviceFiles: [
        {
          basename: "something.json",
          contents: `{ "openapi": "3.0.0" }`,
        },
      ],
    };
    expect(() => serviceParser.parse(serviceDef)).toThrow(/No idea what to do/);
  });
});
