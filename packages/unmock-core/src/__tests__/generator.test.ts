import fs from "fs";
import yaml from "js-yaml";
import { mockGeneratorFactory } from "../generator";
import { ISerializedRequest, RequestToSpec } from "../interfaces";

const getSpecFromRequest: RequestToSpec = (_: ISerializedRequest): any => {
  // uses `x-unmock-size: 4` for `Pets`
  return yaml.load(
    fs.readFileSync(
      __dirname + "/__unmock__/specs/petstore/spec_parsed.yaml",
      "utf8",
    ),
  );
};

describe("Response generator test suite", () => {
  test("Generates array of specified-size on consecutive calls", () => {
    const req: ISerializedRequest = {
      host: "NA",
      method: "get",
      path: "/pets",
      protocol: "https",
    };
    const generator = mockGeneratorFactory(getSpecFromRequest);
    expect(generator(req).response.body.length).toBe(4);
    expect(generator(req).response.body.length).toBe(4);
  });
});
