import { IServiceDef } from "../interfaces";
import { ServiceParser } from "../service/parser";

describe("Service parser", () => {
  it("reads a petstore yaml", () => {
    const serviceParser = new ServiceParser();
    const serviceDef: IServiceDef = {
      directoryName: "petstore",
      serviceFiles: [
        {
          basename: "index.yaml",
          contents: `openapi: 3.0.0`,
        },
      ],
    };
    const service = serviceParser.parse(serviceDef);
    expect(service).toBeDefined();
    expect(service.schema).toHaveProperty("openapi");
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
