import { makeHeaders } from "../../commands/curl";

test("makeHeaders makes headers", () => {
  expect(makeHeaders([" foo : bar", "a:b", "     c:d    "])).toEqual({
    a: "b",
    c: "d",
    foo: "bar",
  });
});
