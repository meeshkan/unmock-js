import { buildFetch, Fetch } from "unmock-fetch";
import { IService, IServiceDefLoader, u, UnmockPackage } from "../";
import { Backend } from "../backend";
import { IInterceptorOptions } from "../interceptor";

let fetch: Fetch;

const interceptorFactory = (opts: IInterceptorOptions) => {
  fetch = buildFetch(opts.onSerializedRequest);
  return {
    disable() {
      // @ts-ignore
      fetch = undefined;
    },
  };
};

const serviceDefLoader: IServiceDefLoader = {
  loadSync() {
    return [];
  },
};

const backend = new Backend({
  interceptorFactory,
  serviceDefLoader,
});

const unmock = new UnmockPackage(backend);

let foo: IService;
beforeAll(() => {
  unmock
    .nock("https://www.foo.com", "foo")
    .get("/hello")
    .reply(200, { foo: u.string() });
  foo = unmock.on().services.foo;
});
beforeEach(() => foo.reset());
afterAll(() => unmock.off());

describe("Unmock", () => {
  it("returns body with expected property", async () => {
    const response = await fetch("https://www.foo.com/hello");
    expect(response.ok).toBe(true);
    const body = await response.json();
    expect(body).toHaveProperty("foo");
  });
  describe("randomize setting", () => {
    afterAll(() => {
      unmock.randomize.off();
    });
    it("should return the same body for the same request when not randomized", async () => {
      unmock.randomize.off();
      const body1 = await (await fetch("https://www.foo.com/hello")).json();
      const body2 = await (await fetch("https://www.foo.com/hello")).json();
      expect(body1).toEqual(body2);
    });
    it("should not return the same body for the same request when randomized", async () => {
      unmock.randomize.on();
      const body1 = await (await fetch("https://www.foo.com/hello")).json();
      const body2 = await (await fetch("https://www.foo.com/hello")).json();
      expect(body1).not.toEqual(body2);
    });
  });
});
