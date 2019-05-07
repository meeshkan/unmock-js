import { curlInternal, makeHeaders } from "../../commands/curl";

test("makeHeaders makes headers", () => {
  expect(makeHeaders([" foo : bar", "a:b", "     c:d    "])).toEqual({
    a: "b",
    c: "d",
    foo: "bar",
  });
});

test("curl works", async () => {
  const data = await curlInternal("https://www.behance.net/v2/projects", {
    headers: ["a: b", "c: d"],
    signature: "foobar",
  });
  expect(data.projects[0].id).toBeGreaterThan(0);
});
