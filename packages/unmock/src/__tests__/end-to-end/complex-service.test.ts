import axios from "axios";
import unmock, { u } from "../../node";

unmock
  .nock("https://api.foo.com/v1", "foo")
  .get("/users")
  .reply(200, {
    hello: {
      bar: { a: 1, b: u.opt(2) },
      foo: u.type({ a: "b", c: u.string() }, {}),
      world: "5",
      z: [1, u.fuzz(2), u.array(u.fuzz({ b: "hello", c: u.cnst("world") }))],
    },
  });

beforeAll(() => {
  unmock.on();
});
afterAll(() => unmock.off());
describe("Complex service test", () => {
  it("Should conform to the service description", async () => {
    const { data } = await axios("https://api.foo.com/v1/users");
    expect(data.hello.bar.a).toBe(1);
    // very, very small chance that this will be 2...
    expect(data.hello.z[1]).not.toBe(2);
  });
});
