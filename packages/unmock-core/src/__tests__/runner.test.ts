import { buildFetch, Fetch } from "unmock-fetch";
import { Service, transform, UnmockPackage } from "..";
import { Backend } from "../backend";
import { IInterceptorOptions } from "../interceptor";
import { testServiceDefLoader } from "./utils";

const { withCodes } = transform;

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

const backend = new Backend({
  interceptorFactory,
  serviceDefLoader: testServiceDefLoader,
});

const unmock = new UnmockPackage(backend);

const runner = unmock.runner.bind(unmock);

describe("Node.js interceptor", () => {
  describe("with state requests in place", () => {
    let petstore: Service;

    beforeAll(() => {
      unmock.on();
      petstore = unmock.services.petstore;
    });
    afterAll(() => unmock.off());

    beforeEach(() => {
      petstore.reset();
    });

    test(
      "runner loop works",
      runner(async () => {
        petstore.state(withCodes(200));
        const resp = await fetch("http://petstore.swagger.io/v1/pets/54");
        const data = await resp.json();
        expect(typeof data.name).toBe("string");
      }),
    );

    test("runner loop fails properly without callback", async () => {
      let threw = false;
      petstore.state(withCodes(200));
      try {
        await runner(async () => {
          const resp = await fetch("http://petstore.swagger.io/v1/pets/54");
          const data = await resp.json();
          expect(data.name).toBe("id");
        })();
      } catch (e) {
        if (e.constructor.name === "JestAssertionError") {
          threw = true;
        }
      }
      expect(threw).toBe(true);
    });
    test("runner loop fails properly with callback", async () => {
      const failure = [];
      const cb: jest.DoneCallback = () => {
        /**/
      };
      cb.fail = (error: string | { message: string }) => {
        failure.push(error);
      };
      petstore.state(withCodes(200));
      await runner(async c => {
        try {
          const resp = await fetch("http://petstore.swagger.io/v1/pets/54");
          const data = await resp.json();
          if (data.name !== "id") {
            throw Error();
          }
        } catch {
          c.fail("testing failure in callback...");
        }
      })(cb);
      expect(failure.length).toBeGreaterThan(0);
    });
  });
});
