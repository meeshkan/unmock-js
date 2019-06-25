import { ServiceParser } from "../service/parser";

describe("Service parser", () => {
  it("reads a petstore yaml", () => {
    const serviceParser = new ServiceParser();
    const service = serviceParser.parse();
    expect(service).toBeDefined();
  });
});
