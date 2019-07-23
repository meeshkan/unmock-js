import { UnmockOptions } from "..";

describe("tests whitelist", () => {
  test("test default whitelist", () => {
    const opts = new UnmockOptions();
    expect(opts.isWhitelisted("127.0.0.1")).toEqual(true);
    expect(opts.isWhitelisted("127.0.2.1")).toEqual(false);
  });

  test("test wildcard mid-string", () => {
    const opts = new UnmockOptions({ whitelist: "12*.0.*.1" });
    expect(opts.isWhitelisted("127.0.foobar.1")).toEqual(true);
    expect(opts.isWhitelisted("127.0..1")).toEqual(true);
    expect(opts.isWhitelisted("127.0.1")).toEqual(false);
    expect(opts.isWhitelisted("12.5.0.1.2.3.4.1")).toEqual(true);
  });
});
