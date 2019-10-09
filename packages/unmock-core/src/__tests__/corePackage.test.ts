import { UnmockPackage } from "..";
import Backend from "../backend/";

class TestBackend extends Backend {
  public constructor() {
    super({ InterceptorCls: jest.fn() });
  }
  public initialize(_: any): never {
    throw Error("Not implemented");
  }
  public reset() {
    return;
  }
  public get services() {
    return {};
  }
  public loadServices() {}
}

const backend = new TestBackend();

describe("Tests core package", () => {
  describe("tests allowedHosts", () => {
    let pkg: UnmockPackage;
    beforeEach(() => {
      pkg = new UnmockPackage(backend);
    });

    test("defaults work as expected", () => {
      expect(pkg.allowedHosts.isWhitelisted("127.0.0.1")).toEqual(true);
      expect(pkg.allowedHosts.isWhitelisted("127.0.2.1")).toEqual(false);
    });

    test("with wildcard mid-string", () => {
      pkg.allowedHosts.set("12*.0.*.1");
      expect(pkg.allowedHosts.isWhitelisted("127.0.foobar.1")).toEqual(true);
      expect(pkg.allowedHosts.isWhitelisted("127.0..1")).toEqual(true);
      expect(pkg.allowedHosts.isWhitelisted("127.0.1")).toEqual(false);
      expect(pkg.allowedHosts.isWhitelisted("12.5.0.1.2.3.4.1")).toEqual(true);
    });

    test("modified post-initialization", () => {
      expect(pkg.allowedHosts.isWhitelisted("127.0.0.1")).toEqual(true);
      expect(pkg.allowedHosts.isWhitelisted("127.0.2.1")).toEqual(false);
      pkg.allowedHosts.set(["*foo*bar*.com"]);
      expect(pkg.allowedHosts.isWhitelisted("127.0.foobar.1")).toEqual(false);
      expect(pkg.allowedHosts.isWhitelisted("127.0.0.1")).toEqual(false);
      expect(pkg.allowedHosts.isWhitelisted("foobar.com")).toEqual(true);
      expect(pkg.allowedHosts.isWhitelisted("https://foo.bar.com")).toEqual(
        true,
      );
    });

    test("concatenated", () => {
      expect(pkg.allowedHosts.isWhitelisted("127.0.0.1")).toEqual(true);
      expect(pkg.allowedHosts.isWhitelisted("127.0.2.1")).toEqual(false);
      pkg.allowedHosts.add("*foo*bar*.com");
      expect(pkg.allowedHosts.isWhitelisted("127.0.foobar.1")).toEqual(false);
      expect(pkg.allowedHosts.isWhitelisted("127.0.0.1")).toEqual(true);
      expect(pkg.allowedHosts.isWhitelisted("foobar.com")).toEqual(true);
      expect(pkg.allowedHosts.isWhitelisted("https://foo.bar.com")).toEqual(
        true,
      );
    });
  });
});
