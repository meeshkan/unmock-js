import { defaultOptions, ignoreAuth } from "unmock";
import computeHash, { makeHashable } from "../../../hash/v0";

describe("Hash function", () => {
    test("is stable", async () => {
        const object = { a: 1, b: "foobar" };
        const hash = computeHash(object, "[]");
        expect(hash).toBe("35447ce7");
    });
    test("is invariant to the order of keys", async () => {
        const object1 = { a: 1, b: "foobar" };
        const object2 = { b: object1.b, a: object1.a };
        const hash1 = computeHash(object1, "[]");
        const hash2 = computeHash(object2, "[]");
        expect(hash2).toBe(hash1);
    });
    test("changes when ignoring a key", async () => {
        const object = { a: 1, b: "foobar" };
        const hash1 = computeHash(object, "[]");
        const hash2 = computeHash(object, "[\"a\"]");
        expect(hash2).not.toBe(hash1);
    });
    test("does not change when ignoring an unknown key", async () => {
      const object = { a: 1, b: "foobar" };
      const hash1 = computeHash(object, "[]");
      const hash2 = computeHash(object, "[\"c\"]");
      expect(hash2).toBe(hash1);
    });
    test("real life stripe example that was generating different hashes", () => {
      const incoming0 = {
        body : "metadata%5Buser_id%5D=test-user",
        headers : {
          Accept : "application/json",
          Authorization : "Bearer sk_test_QRUTTCmwWuOwzwUIblT1Ldt5",
          ["Content-Type"] : "application/x-www-form-urlencoded",
          ["Content-Length"] : 31,
          ["User-Agent"] : "Stripe/v1 NodeBindings/6.20.0",
          // tslint:disable-next-line:max-line-length
          ["X-Stripe-Client-User-Agent"] : "{\"bindings_version\":\"6.20.0\",\"lang\":\"node\",\"lang_version\":\"v10.15.2\",\"platform\":\"linux\",\"publisher\":\"stripe\",\"uname\":\"Linux%20fv-az598%204.15.0-1037-azure%20%2339~16.04.1-Ubuntu%20SMP%20Tue%20Jan%2015%2017%3A20%3A47%20UTC%202019%20x86_64%20x86_64%20x86_64%20GNU%2FLinux%0A\"}",
        },
        hostname : "api.stripe.com",
        method : "POST",
        path : "/v1/customers",
        story : [ ],
        user_id : "github|525350",
      };
      const incoming1 = {
        body : "metadata%5Buser_id%5D=test-user",
        headers : {
          Accept : "application/json",
          Authorization : "Bearer sk_test_QRUTTCmwWuOwzwUIblT1Ldt5",
          ["Content-Type"] : "application/x-www-form-urlencoded",
          ["Content-Length"] : 31,
          ["User-Agent"] : "Stripe/v1 NodeBindings/6.20.0",
          // tslint:disable-next-line:max-line-length
          ["X-Stripe-Client-User-Agent"] : "{\"bindings_version\":\"6.20.0\",\"lang\":\"node\",\"lang_version\":\"v10.15.2\",\"platform\":\"linux\",\"publisher\":\"stripe\",\"uname\":\"Linux%20fv-az586%204.15.0-1037-azure%20%2339~16.04.1-Ubuntu%20SMP%20Tue%20Jan%2015%2017%3A20%3A47%20UTC%202019%20x86_64%20x86_64%20x86_64%20GNU%2FLinux%0A\"}",
        },
        hostname : "api.stripe.com",
        method : "POST",
        path : "/v1/customers",
        story : [ ],
        user_id : "github|525350",
      };
      const hashy = ignoreAuth(defaultOptions)({
        ignore: {headers: "\w*User-Agent\w*"},
      });
      expect(computeHash(incoming0, JSON.stringify(hashy.ignore)))
        .toEqual(computeHash(incoming1, JSON.stringify(hashy.ignore)));
    });
});

describe("makeHashable", () => {
  test("filters correctly with string", () => {
    expect(makeHashable({ a: 1, b: 2, c: 3},  "a")).toEqual({b: 2, c: 3});
  });

  test("filters correctly with two strings", () => {
    expect(makeHashable({ a: 1, b: 2, c: 3},  ["a", "b"])).toEqual({ c: 3});
  });

  test("filters correctly with regexp", () => {
    expect(makeHashable({ a: 1, b: 2, c: 3},  "a|b")).toEqual({ c: 3});
  });

  test("filters correctly with nested object", () => {
    expect(makeHashable({ a: {q: 1, r: 2}, b: 2, c: 3},  {a: "q"})).toEqual({ a: {r: 2}, b: 2, c: 3});
  });

  test("filters correctly with nested object and array", () => {
    expect(makeHashable({ a: {q: 1, r: 2, s: 5}, b: 2, c: 3},  {a: ["q", "r"]})).toEqual({ a: {s: 5}, b: 2, c: 3});
  });

  test("filters correctly with nested object and regexp", () => {
    expect(makeHashable({ a: {q: 1, r: 2, s: 5}, b: 2, c: 3},  {a: "q|r"})).toEqual({ a: {s: 5}, b: 2, c: 3});
  });

  test("filters correctly based on value", () => {
    expect(makeHashable({ a: {q: 1, r: 2, s: "m"}, b: 2, c: 3},  {a: { s: "m"}}))
     .toEqual({ a: {q: 1, r: 2}, b: 2, c: 3});
  });

  test("filters correctly based on value with regexp", () => {
    expect(makeHashable({ a: {q: 1, r: 2, s: "moooo"}, b: 2, c: 3},  {a: { s: "mo*"}}))
      .toEqual({ a: {q: 1, r: 2}, b: 2, c: 3});
  });

  test("filters something realistic", () => {
    const real = {
      headers : {
        Accept : "application/json",
        Authorization : "Bearer can-safely-ignore",
        ["Content-Type"] : "application/x-www-form-urlencoded",
        ["Content-Length"] : 96,
        ["User-Agent"] : "Stripe/v1 NodeBindings/6.20.0",
        // tslint:disable-next-line:max-line-length
        ["X-Stripe-Client-User-Agent"] : "{\"bindings_version\":\"6.20.0\",\"lang\":\"node\",\"lang_version\":\"v10.15.0\",\"platform\":\"linux\",\"publisher\":\"stripe\",\"uname\":\"Linux%20fv-az558%204.15.0-1035-azure%20%2336~16.04.1-Ubuntu%20SMP%20Fri%20Nov%2030%2015%3A25%3A49%20UTC%202018%20x86_64%20x86_64%20x86_64%20GNU%2FLinux%0A\"}",
      },
      hostname : "api.stripe.com",
      method : "POST",
      path : "/v1/subscriptions",
      story : [
        "b3886215",
        "7a41f8b9",
      ],
      user_id : "github|525350",
    };
    const noStory = {
      headers : {
        Accept : "application/json",
        Authorization : "Bearer can-safely-ignore",
        ["Content-Type"] : "application/x-www-form-urlencoded",
        ["Content-Length"] : 96,
        ["User-Agent"] : "Stripe/v1 NodeBindings/6.20.0",
        // tslint:disable-next-line:max-line-length
        ["X-Stripe-Client-User-Agent"] : "{\"bindings_version\":\"6.20.0\",\"lang\":\"node\",\"lang_version\":\"v10.15.0\",\"platform\":\"linux\",\"publisher\":\"stripe\",\"uname\":\"Linux%20fv-az558%204.15.0-1035-azure%20%2336~16.04.1-Ubuntu%20SMP%20Fri%20Nov%2030%2015%3A25%3A49%20UTC%202018%20x86_64%20x86_64%20x86_64%20GNU%2FLinux%0A\"}",
      },
      hostname : "api.stripe.com",
      method : "POST",
      path : "/v1/subscriptions",
      user_id : "github|525350",
    };
    const noAgent = {
      headers : {
        Accept : "application/json",
        Authorization : "Bearer can-safely-ignore",
        ["Content-Type"] : "application/x-www-form-urlencoded",
        ["Content-Length"] : 96,
      },
      hostname : "api.stripe.com",
      method : "POST",
      path : "/v1/subscriptions",
      story : [
        "b3886215",
        "7a41f8b9",
      ],
      user_id : "github|525350",
    };
    const noStoryNoAgent = {
      headers : {
        Accept : "application/json",
        Authorization : "Bearer can-safely-ignore",
        ["Content-Type"] : "application/x-www-form-urlencoded",
        ["Content-Length"] : 96,
      },
      hostname : "api.stripe.com",
      method : "POST",
      path : "/v1/subscriptions",
      user_id : "github|525350",
    };
    const noStoryNoAgentNoAuth = {
      headers : {
        Accept : "application/json",
        ["Content-Type"] : "application/x-www-form-urlencoded",
        ["Content-Length"] : 96,
      },
      hostname : "api.stripe.com",
      method : "POST",
      path : "/v1/subscriptions",
      user_id : "github|525350",
    };
    expect(makeHashable(real, "story")).toEqual(noStory);
    expect(makeHashable(real, {headers: "\w*User-Agent\w*"})).toEqual(noAgent);
    expect(makeHashable(real, ["story", {headers: "\w*User-Agent\w*"}])).toEqual(noStoryNoAgent);
    expect(makeHashable(real, ["story", {headers: ["\w*User-Agent\w*", "Authorization"]}]))
      .toEqual(noStoryNoAgentNoAuth);
  });
});
