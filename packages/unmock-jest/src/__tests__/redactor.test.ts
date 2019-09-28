import { authRedactor } from "../reporter/options";
import { testRequest } from "./fake-data";
test("auth redactor redacts authentication tokens", () => {
  expect(
    authRedactor({
      ...testRequest,
      headers: {
        authorization: "foo",
        Authorization: "bar",
        hello: "world",
      },
    }),
  ).toEqual({
    req: {
      ...testRequest,
      headers: {
        hello: "world",
        authorization: "-- redacted --",
        Authorization: "-- redacted --",
      },
    },
    res: undefined,
  });
});
