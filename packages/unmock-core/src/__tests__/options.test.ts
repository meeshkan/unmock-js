import { UnmockOptions } from "../options";

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

test("forget to set persistence", () => {
  const opts = new UnmockOptions();
  expect(() => {
    opts.persistence.getPath();
  }).toThrow();
  expect(() => {
    opts.persistence.hasHash("foo");
  }).toThrow();
  expect(() => {
    opts.persistence.loadAuth();
  }).toThrow();
  expect(() => {
    opts.persistence.loadMeta("foo");
  }).toThrow();
  expect(() => {
    opts.persistence.loadRequest("foo");
  }).toThrow();
  expect(() => {
    opts.persistence.loadResponse("foo");
  }).toThrow();
  expect(() => {
    opts.persistence.loadToken();
  }).toThrow();
  expect(() => {
    opts.persistence.loadUserId();
  }).toThrow();
  expect(() => {
    opts.persistence.saveAuth("foo");
  }).toThrow();
  expect(() => {
    opts.persistence.saveMeta("foo", {});
  }).toThrow();
  expect(() => {
    opts.persistence.saveRequest("foo", {});
  }).toThrow();
  expect(() => {
    opts.persistence.saveResponse("foo", {});
  }).toThrow();
});
