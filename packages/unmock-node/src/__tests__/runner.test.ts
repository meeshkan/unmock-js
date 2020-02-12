import axios from "axios";
import * as path from "path";
import { Service, transform, UnmockPackage } from "unmock-core";
import NodeBackend from "../backend";
const { withCodes } = transform;
import jestRunner from "unmock-jest-runner";

const servicesDirectory = path.join(__dirname, "__unmock__");

describe("Node.js interceptor", () => {
  describe("with state requests in place", () => {
    const nodeBackend = new NodeBackend({ servicesDirectory });
    const unmock = new UnmockPackage(nodeBackend);

    let petstore: Service;

    beforeAll(() => {
      unmock.on();
      petstore = unmock.services.petstore;
    });
    afterAll(() => unmock.off());

    beforeEach(() => {
      petstore.reset();
    });

    unmock.randomize.on();

    test(
      "runner loop works",
      jestRunner(async () => {
        petstore.state(withCodes(200));
        const resp = await axios("http://petstore.swagger.io/v1/pets/54");
        expect(typeof resp.data.name).toBe("string");
      }),
    );

    test("runner loop fails properly without callback", async () => {
      let threw = false;
      petstore.state(withCodes(200));
      try {
        await jestRunner(async () => {
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
      const cb: jest.DoneCallback = () => {
        /**/
      };
      cb.fail = (error: string | { message: string }) => {
        failure.push(error);
      };
      petstore.state(withCodes(200));
      await jestRunner(async c => {
        try {
          const resp = await axios("http://petstore.swagger.io/v1/pets/54");
          if (resp.data.name !== "id") {
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
