import axios from "axios";
import unmock, { gen, u } from "../../";
const { responseBody } = gen;

unmock
  .nock("https://api.foo.com/v1", "foo")
  .get("/users")
  .reply(200, u.array(
    u.type({
      id: u.number(),
      name: u.number(),
    }, {
      address: u.type({
        city: u.string(),
        state: u.string(),
      }, {}),
    }),
  ));

describe("Simple service test", () => {
  it("Should return sane values from a simple service", async () => {
    const { foo } = unmock.on().services;
    foo.state(
      responseBody().minItems(56),
    );
    const response0 = await axios("https://api.foo.com/v1/users");
    expect(response0.data.length).toBeGreaterThanOrEqual(56);
  });
});
