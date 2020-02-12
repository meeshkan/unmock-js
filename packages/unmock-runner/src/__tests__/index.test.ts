import unmock, { transform, IService } from "unmock";
import fetch from "node-fetch";
import jestRunner from "unmock-jest-runner";

unmock
  .nock("http://petstore.swagger.io", "petstore")
  .get("/v1/pets/54")
  .reply(200, { id: 10, name: "foo", tags: "bar" });

const { withCodes } = transform;

describe("Runner loop", () => {
  let petstore: IService;

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
    "should run successfully when API calls succeeds",
    jestRunner(async () => {
      petstore.state(withCodes(200));
      const resp = await fetch("http://petstore.swagger.io/v1/pets/54");
      const data = await resp.json();
      expect(typeof data.name).toBe("string");
    }),
  );

  test("should throw JestAssertionError when assertion fails and no callback is given", async () => {
    let threw = false;
    petstore.state(withCodes(200));
    try {
      await jestRunner(async () => {
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
  test("should fail properly when exception is thrown and callback is given", async () => {
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
