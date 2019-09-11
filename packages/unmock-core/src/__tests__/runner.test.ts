import axios from "axios";
import path from "path";
import { runner, Service, UnmockPackage } from "..";
import NodeBackend from "../backend";

const servicesDirectory = path.join(__dirname, "__unmock__");

describe("Node.js interceptor", () => {
  describe("with state requests in place", () => {
    const nodeInterceptor = new NodeBackend({ servicesDirectory });
    const unmock = new UnmockPackage(nodeInterceptor);
    let petstore: Service;

    beforeAll(() => {
      unmock.on();
      petstore = unmock.services.petstore;
    });
    afterAll(() => unmock.off());

    beforeEach(() => {
      petstore.reset();
    });

    test("runner loop works", runner(async () => {
      const resp = await axios("http://petstore.swagger.io/v1/pets/54");
      expect(typeof resp.data.name).toBe("string");
    }));

    // TODO: I cannot get this to work with expect.toThrow()...
    test("runner loop fails properly without callback", async () => {
      let threw = false;
      try {
        await runner(async () => {
          const resp = await axios("http://petstore.swagger.io/v1/pets/54");
          expect(resp.data.name).toBe("id");
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
      const cb: jest.DoneCallback = () => { /**/ };
      cb.fail = (error: string | {message: string}) => { failure.push(error); };
      await runner(async (c) => {
        try {
          const resp = await axios("http://petstore.swagger.io/v1/pets/54");
          if (resp.data.name !== "id") { throw Error(); }
        } catch {
          c.fail("testing failure in callback...");
        }
      })(cb);
      expect(failure.length).toBeGreaterThan(0);
    });
  });
});
