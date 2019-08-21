import { CorePackage, IBackend } from "..";

class TestPackage extends CorePackage {
  public states() {
    return undefined;
  }
}
// tslint:disable-next-line: max-classes-per-file
class TestBackend implements IBackend {
  public initialize(_: any): never {
    throw Error("Not implemented");
  }
  public reset() {
    return;
  }
  public get services() {
    return {};
  }
}
const backend = new TestBackend();

describe("Tests core package", () => {
  describe("tests allowedHosts", () => {
    let pkg: TestPackage;
    beforeEach(() => {
      pkg = new TestPackage(backend);
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
