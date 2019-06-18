import { genMockFromSerializedRequest } from "../generator";

describe("Response generator test suite", () => {
  test("Psuedo-test #1", () => {
    genMockFromSerializedRequest({
      host: "NA",
      method: "get",
      path: "/pets",
      protocol: "https",
    });
  });
});
