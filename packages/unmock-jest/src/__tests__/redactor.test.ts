import { ISnapshot } from "unmock";
import { authRedactor } from "../reporter/utils";
import { testRequest } from "./fake-data";

const snapshot: ISnapshot = {
  timestamp: new Date(),
  testPath: "blah",
  currentTestName: "blah2",
  data: {
    req: {
      ...testRequest,
      headers: {
        authorization: "foo",
        Authorization: "bar",
        hello: "world",
      },
    },
    res: undefined,
  },
};

describe("auth redactor", () => {
  test("should redact authentication tokens", () => {
    expect(authRedactor(snapshot)).toEqual({
      ...snapshot,
      data: {
        req: {
          ...testRequest,
          headers: {
            hello: "world",
            authorization: "-- redacted --",
            Authorization: "-- redacted --",
          },
        },
        res: undefined,
      },
    });
  });
});
