import axios from "axios";
import { removeCodes } from "openapi-refinements";
import * as path from "path";
import { Service, sinon, transform, UnmockPackage } from "unmock-core";
import NodeBackend from "../../backend";
import { UNMOCK_INTERNAL_HTTP_HEADER } from "../../interceptor/client-request-tracker";

const servicesDirectory = path.join(__dirname, "..", "__unmock__");

describe("Loads services properly", () => {
  it("loads all paths in __unmock__", () => {
    const backend = new NodeBackend({ servicesDirectory });
    backend.services.slack.state((_, __) => __); // should pass
    // we have intentionally set an incorrect format in petstore's yml file
    // grep for `intentionally_broken_format`
    // it should load anyway
    backend.services.petstore.state((_, __) => __); // should pass
    expect(() => backend.services.github.state((_, __) => __)).toThrow(
      "property 'state' of undefined",
    ); // no github service
  });
});

describe("Node.js interceptor", () => {
  describe("with petstore in place", () => {
    let nodeInterceptor: NodeBackend;

    beforeAll(() => {
      nodeInterceptor = new NodeBackend({ servicesDirectory });
      nodeInterceptor.initialize({
        isWhitelisted: (_: string) => false,
        log: (_: string) => undefined,
        randomize: () => false,
      });
      const petstore = nodeInterceptor.services.petstore;
      petstore.state((_, o) => removeCodes(true, true, ["default"])(o));
    });

    afterAll(() => {
      nodeInterceptor.reset();
    });

    test("gets successful response for valid request", async () => {
      const response = await axios("http://petstore.swagger.io/v1/pets");
      expect(response.status).toBe(200);
      const data = response.data;
      // As no specific code was set, we expect either valid response
      // or an error response (based on service specification)

      if (data.message !== undefined) {
        // error message chosen at random
        expect(typeof data.code === "number").toBeTruthy();
        expect(typeof data.message === "string").toBeTruthy();
      } else if (typeof data !== "string") {
        expect(data.length).toBeGreaterThan(0);
        expect(
          data.every(
            (pet: any) =>
              typeof pet.id === "number" && typeof pet.name === "string",
          ),
        ).toBeTruthy();
      }
    });

    test("should get successful response for post request", async () => {
      const response = await axios.post(
        "http://petstore.swagger.io/v1/pets",
        {},
      );
      expect(response.data).toBe("");
    });

    test("emits an error for unknown url", async () => {
      try {
        await axios("http://example.org");
      } catch (err) {
        expect(err.message).toContain(
          "unmock error: Cannot find a matcher for this request",
        );
        return;
      }
      throw new Error("Should not get here");
    });
  });
});

describe("Unmock node package", () => {
  const nodeInterceptor = new NodeBackend({ servicesDirectory });
  const unmock = new UnmockPackage(nodeInterceptor);
  afterAll(() => {
    unmock.off();
  });
  describe("service spy", () => {
    let petstore: Service;
    beforeAll(() => {
      petstore = unmock.on().services.petstore;
    });
    beforeEach(() => {
      petstore.reset();
      petstore.state((_, o) => removeCodes(true, true, ["default"])(o));
    });
    test("should track a successful request-response pair", async () => {
      await axios.post("http://petstore.swagger.io/v1/pets", {});
      sinon.assert.calledOnce(petstore.spy);
      sinon.assert.calledWith(petstore.spy, sinon.match({ method: "post" }));
      expect(petstore.spy.firstCall.returnValue).toEqual(
        expect.objectContaining({ statusCode: 201 }),
      );
    });
    test("should reset spies with unmock.reset()", async () => {
      await axios.post("http://petstore.swagger.io/v1/pets", {});
      sinon.assert.calledOnce(petstore.spy);
      unmock.reset();
      sinon.assert.notCalled(petstore.spy);
    });
    test("should not have tracked calls after reset", async () => {
      await axios.post("http://petstore.swagger.io/v1/pets", {});
      petstore.reset();
      sinon.assert.notCalled(petstore.spy);
    });
  });
  describe("call tracking", () => {
    let petstore: Service;
    beforeAll(() => {
      petstore = unmock.on().services.petstore;
    });
    beforeEach(() => {
      petstore.reset();
      petstore.state(transform.withCodes(201));
    });
    afterAll(() => {
      unmock.off();
    });
    test("should not leave internally used tracking ID in request header", async () => {
      await axios.post("http://petstore.swagger.io/v1/pets", {});
      const requestHeaders = petstore.spy.postRequestHeaders();
      expect(requestHeaders).not.toHaveProperty(UNMOCK_INTERNAL_HTTP_HEADER);
    });
  });
});
