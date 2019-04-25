import { defaultOptions, ignoreAuth } from "unmock-core";
import computeHash, { makeIgnorable } from "../../../hash/v0";

describe("hash function", () => {
    test("sanity test for simple object", () => {
      const incoming0 = {
        body : "foo",
        headers : {
          hello: "world",
        },
        hostname : "api.example.com",
        method : "POST",
        path : "/v1/hello",
        story : [ ],
        user_id : "me",
      };
      const incoming1 = {
        body : "foo",
        hostname : "api.example.com",
        // tslint:disable-next-line:object-literal-sort-keys
        headers : {
          hello: "world",
        },
        method : "POST",
        path : "/v1/hello",
        story : [ ],
        user_id : "me",
      };
      expect(computeHash(incoming0))
      .toEqual(computeHash(incoming1));
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
      expect(computeHash(incoming0, hashy.ignore))
        .toEqual(computeHash(incoming1, hashy.ignore));
    });
});

describe("make ignorable", () => {
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
    expect(makeIgnorable(real, "story")).toEqual(noStory);
    expect(makeIgnorable(real, {headers: "\w*User-Agent\w*"})).toEqual(noAgent);
    expect(makeIgnorable(real, ["story", {headers: "\w*User-Agent\w*"}])).toEqual(noStoryNoAgent);
    expect(makeIgnorable(real, ["story", {headers: ["\w*User-Agent\w*", "Authorization"]}]))
      .toEqual(noStoryNoAgentNoAuth);
  });
});
