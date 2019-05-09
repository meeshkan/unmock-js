import { ignoreAuth } from "unmock-core";
import computeHash, { makeIgnorable } from "../../../hash/v0";

describe("hash function", () => {
  const base = {
    body: "foo",
    headers: {
      hello: "world",
    },
    hostname: "api.example.com",
    method: "POST",
    path: "/v1/hello",
    story: [],
    user_id: "me",
  };
  test("sanity test", () => {
    const incoming0 = {
      ...base,
    };
    const incoming1 = {
      ...base,
      body: "bar",
    };
    expect(computeHash(incoming0) === computeHash(incoming1)).toEqual(false);
  });
  test("simple ignore", () => {
    const incoming0 = {
      ...base,
    };
    const incoming1 = {
      ...base,
      body: "bar",
    };
    expect(computeHash(incoming0, "body")).toEqual(
      computeHash(incoming1, "body"),
    );
  });
  test("header case invariance", () => {
    const incoming0 = {
      ...base,
      headers: {
        foo: "Bar",
      },
    };
    const incoming1 = {
      ...base,
      headers: {
        Foo: "Bar",
      },
    };
    expect(
      computeHash(incoming0, undefined, "make-header-keys-lowercase"),
    ).toEqual(computeHash(incoming1, undefined, "make-header-keys-lowercase"));
  });
  test("json deserialization", () => {
    const incoming0 = {
      ...base,
      body: '{"foo":1,    "bar":"baz" } ',
    };
    const incoming1 = {
      ...base,
      body: '   { "bar":"baz", "foo":     1 }',
    };
    expect(computeHash(incoming0, undefined, "deserialize-json-body")).toEqual(
      computeHash(incoming1, undefined, "deserialize-json-body"),
    );
  });
  test("no json deserialization", () => {
    const incoming0 = {
      ...base,
      body: '{"foo":1,    "bar":"baz" } ',
    };
    const incoming1 = {
      ...base,
      body: '   { "bar":"baz", "foo":     1 }',
    };
    expect(computeHash(incoming0) === computeHash(incoming1)).toEqual(false);
  });
  test("json deserialization", () => {
    const incoming0 = {
      ...base,
      body: "hello=world&foo=bar|bar",
    };
    const incoming1 = {
      ...base,
      body: "foo=bar%7Cbar&hello=world",
    };
    expect(
      computeHash(
        incoming0,
        undefined,
        "deserialize-x-www-form-urlencoded-body",
      ),
    ).toEqual(
      computeHash(
        incoming1,
        undefined,
        "deserialize-x-www-form-urlencoded-body",
      ),
    );
  });
  test("real life stripe example that was generating different hashes", () => {
    const incoming0 = {
      body: "metadata%5Buser_id%5D=test-user",
      headers: {
        Accept: "application/json",
        Authorization: "Bearer sk_test_QRUTTCmwWuOwzwUIblT1Ldt5",
        ["Content-Type"]: "application/x-www-form-urlencoded",
        ["Content-Length"]: 31,
        ["User-Agent"]: "Stripe/v1 NodeBindings/6.20.0",
        ["X-Stripe-Client-User-Agent"]:
          // tslint:disable-next-line:max-line-length
          '{"bindings_version":"6.20.0","lang":"node","lang_version":"v10.15.2","platform":"linux","publisher":"stripe","uname":"Linux%20fv-az598%204.15.0-1037-azure%20%2339~16.04.1-Ubuntu%20SMP%20Tue%20Jan%2015%2017%3A20%3A47%20UTC%202019%20x86_64%20x86_64%20x86_64%20GNU%2FLinux%0A"}',
      },
      hostname: "api.stripe.com",
      method: "POST",
      path: "/v1/customers",
      story: [],
      user_id: "github|525350",
    };
    const incoming1 = {
      body: "metadata%5Buser_id%5D=test-user",
      headers: {
        Accept: "application/json",
        Authorization: "Bearer sk_test_QRUTTCmwWuOwzwUIblT1Ldt5",
        ["Content-Type"]: "application/x-www-form-urlencoded",
        ["Content-Length"]: 31,
        ["User-Agent"]: "Stripe/v1 NodeBindings/6.20.0",
        ["X-Stripe-Client-User-Agent"]:
          // tslint:disable-next-line:max-line-length
          '{"bindings_version":"6.20.0","lang":"node","lang_version":"v10.15.2","platform":"linux","publisher":"stripe","uname":"Linux%20fv-az586%204.15.0-1037-azure%20%2339~16.04.1-Ubuntu%20SMP%20Tue%20Jan%2015%2017%3A20%3A47%20UTC%202019%20x86_64%20x86_64%20x86_64%20GNU%2FLinux%0A"}',
      },
      hostname: "api.stripe.com",
      method: "POST",
      path: "/v1/customers",
      story: [],
      user_id: "github|525350",
    };
    const hashy = ignoreAuth()({
      ignore: { headers: "w*User-Agentw*" },
    });
    expect(computeHash(incoming0, hashy.ignore)).toEqual(
      computeHash(incoming1, hashy.ignore),
    );
  });
});

describe("make ignorable", () => {
  test("filters something realistic", () => {
    const real = {
      headers: {
        Accept: "application/json",
        Authorization: "Bearer can-safely-ignore",
        ["Content-Type"]: "application/x-www-form-urlencoded",
        ["Content-Length"]: 96,
        ["User-Agent"]: "Stripe/v1 NodeBindings/6.20.0",
        // tslint:disable-next-line:max-line-length
        ["X-Stripe-Client-User-Agent"]:
          '{"bindings_version":"6.20.0","lang":"node","lang_version":"v10.15.0","platform":"linux","publisher":"stripe","uname":"Linux%20fv-az558%204.15.0-1035-azure%20%2336~16.04.1-Ubuntu%20SMP%20Fri%20Nov%2030%2015%3A25%3A49%20UTC%202018%20x86_64%20x86_64%20x86_64%20GNU%2FLinux%0A"}',
      },
      hostname: "api.stripe.com",
      method: "POST",
      path: "/v1/subscriptions",
      story: ["b3886215", "7a41f8b9"],
      user_id: "github|525350",
    };
    const noStory = {
      headers: {
        Accept: "application/json",
        Authorization: "Bearer can-safely-ignore",
        ["Content-Type"]: "application/x-www-form-urlencoded",
        ["Content-Length"]: 96,
        ["User-Agent"]: "Stripe/v1 NodeBindings/6.20.0",
        // tslint:disable-next-line:max-line-length
        ["X-Stripe-Client-User-Agent"]:
          '{"bindings_version":"6.20.0","lang":"node","lang_version":"v10.15.0","platform":"linux","publisher":"stripe","uname":"Linux%20fv-az558%204.15.0-1035-azure%20%2336~16.04.1-Ubuntu%20SMP%20Fri%20Nov%2030%2015%3A25%3A49%20UTC%202018%20x86_64%20x86_64%20x86_64%20GNU%2FLinux%0A"}',
      },
      hostname: "api.stripe.com",
      method: "POST",
      path: "/v1/subscriptions",
      user_id: "github|525350",
    };
    const noAgent = {
      headers: {
        Accept: "application/json",
        Authorization: "Bearer can-safely-ignore",
        ["Content-Type"]: "application/x-www-form-urlencoded",
        ["Content-Length"]: 96,
      },
      hostname: "api.stripe.com",
      method: "POST",
      path: "/v1/subscriptions",
      story: ["b3886215", "7a41f8b9"],
      user_id: "github|525350",
    };
    const noStoryNoAgent = {
      headers: {
        Accept: "application/json",
        Authorization: "Bearer can-safely-ignore",
        ["Content-Type"]: "application/x-www-form-urlencoded",
        ["Content-Length"]: 96,
      },
      hostname: "api.stripe.com",
      method: "POST",
      path: "/v1/subscriptions",
      user_id: "github|525350",
    };
    const noStoryNoAgentNoAuth = {
      headers: {
        Accept: "application/json",
        ["Content-Type"]: "application/x-www-form-urlencoded",
        ["Content-Length"]: 96,
      },
      hostname: "api.stripe.com",
      method: "POST",
      path: "/v1/subscriptions",
      user_id: "github|525350",
    };
    expect(makeIgnorable(real, "story")).toEqual(noStory);
    expect(makeIgnorable(real, { headers: "w*User-Agentw*" })).toEqual(noAgent);
    expect(
      makeIgnorable(real, ["story", { headers: "w*User-Agentw*" }]),
    ).toEqual(noStoryNoAgent);
    expect(
      makeIgnorable(real, [
        "story",
        { headers: ["w*User-Agentw*", "Authorization"] },
      ]),
    ).toEqual(noStoryNoAgentNoAuth);
  });
});
