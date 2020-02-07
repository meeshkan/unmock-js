import * as assert from "assert";
import axios from "axios";
import unmock, { u, mochaRunner } from "../../node";

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

beforeEach(() => {
  unmock.on();
});

describe("an awesome test", () => {
  it(
    "rocks my socks",
    mochaRunner(done => {
      axios("https://api.foo.com/v1/users").then(({ data }) => {
        assert.equal(data.hello.bar.a, 1);
        // very, very small chance that this will be 2...
        assert.notEqual(data.hello.z[1], 2);
        done();
      });
    }),
  );
});
