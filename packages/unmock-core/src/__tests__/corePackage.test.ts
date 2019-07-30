import { CorePackage, IBackend } from "..";

class TestPackage extends CorePackage {
  public states() {
    return;
  }
}
// tslint:disable-next-line: max-classes-per-file
class TestBackend implements IBackend {
  public initialize(_: any) {
    return;
  }
  public reset() {
    return;
  }
}
const backend = new TestBackend();

describe("tests allowedHosts", () => {
  test("defaults work as expected", () => {
    const pkg = new TestPackage(backend);
    expect(pkg.isWhitelisted("127.0.0.1")).toEqual(true);
    expect(pkg.isWhitelisted("127.0.2.1")).toEqual(false);
  });

  test("with wildcard mid-string", () => {
    const pkg = new TestPackage(backend);
    pkg.allowedHosts = ["12*.0.*.1"];
    expect(pkg.isWhitelisted("127.0.foobar.1")).toEqual(true);
    expect(pkg.isWhitelisted("127.0..1")).toEqual(true);
    expect(pkg.isWhitelisted("127.0.1")).toEqual(false);
    expect(pkg.isWhitelisted("12.5.0.1.2.3.4.1")).toEqual(true);
  });

  test("modified post-initialization", () => {
    const pkg = new TestPackage(backend);
    expect(pkg.isWhitelisted("127.0.0.1")).toEqual(true);
    expect(pkg.isWhitelisted("127.0.2.1")).toEqual(false);
    pkg.allowedHosts = ["*foo*bar*.com"];
    expect(pkg.isWhitelisted("127.0.foobar.1")).toEqual(false);
    expect(pkg.isWhitelisted("127.0.0.1")).toEqual(false);
    expect(pkg.isWhitelisted("foobar.com")).toEqual(true);
    expect(pkg.isWhitelisted("https://foo.bar.com")).toEqual(true);
  });

  test("concatenated", () => {
    const pkg = new TestPackage(backend);
    expect(pkg.isWhitelisted("127.0.0.1")).toEqual(true);
    expect(pkg.isWhitelisted("127.0.2.1")).toEqual(false);
    pkg.allowedHosts = pkg.allowedHosts.concat(["*foo*bar*.com"]);
    expect(pkg.isWhitelisted("127.0.foobar.1")).toEqual(false);
    expect(pkg.isWhitelisted("127.0.0.1")).toEqual(true);
    expect(pkg.isWhitelisted("foobar.com")).toEqual(true);
    expect(pkg.isWhitelisted("https://foo.bar.com")).toEqual(true);
  });
});
