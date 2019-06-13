import { UnmockOptions } from "../";
import { doUsefulStuffWithRequestAndResponse } from "../util";

test("doUsefulStuffWithRequestAndResponse", () => {
  const opts = new UnmockOptions({});
  doUsefulStuffWithRequestAndResponse(
    opts,
    {
      lang: "foobar",
    },
    {
      headers: { mike: "solomon" },
      host: "www.foo.com",
      path: "/bar/baz",
    },
    {
      body: "kimmo sääskilahti",
      headers: { idan: "tene" },
    },
  );
});

