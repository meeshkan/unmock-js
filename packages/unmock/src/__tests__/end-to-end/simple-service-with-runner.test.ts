import axios from "axios";
import { IService } from "unmock-core";
import unmock, { transform, u } from "../../node";
import jestRunner from "../../../../unmock-runner/src/jestRunner";
const { responseBody } = transform;

unmock
  .nock("https://api.foo.com/v1", "foo")
  .get("/users")
  .reply(
    200,
    u.array(
      u.type(
        {
          address: {
            city: u.string(),
            state: u.string(),
          },
        },
        {
          id: u.number(),
          name: u.number(),
        },
      ),
    ),
  );

let foo: IService;
beforeAll(() => {
  foo = unmock.on().services.foo;
});
afterAll(() => unmock.off());

unmock.randomize.on();

describe("Simple service test with runner", () => {
  it(
    "Should reset spies correctly",
    jestRunner(async () => {
      foo.state(responseBody().minItems(56));
      const response0 = await axios("https://api.foo.com/v1/users");
      // because we are running the runner, this spy
      // should get reset automatically
      // if it is not, the get will throw an error because
      // there are multiple calls
      expect(foo.spy.getRequestPath()).toBe("/v1/users");
      expect(response0.data.length).toBeGreaterThanOrEqual(56);
    }),
  );
});
