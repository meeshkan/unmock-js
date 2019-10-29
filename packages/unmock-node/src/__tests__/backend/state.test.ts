import axios from "axios";
import { OpenAPIObject } from "loas3/dist/generated/full";
import { Arr } from "openapi-refinements";
import * as path from "path";
import {
  ISerializedRequest,
  Service,
  transform,
  UnmockPackage,
} from "unmock-core";
import NodeBackend from "../../backend";

const {
  withCodes,
  withoutCodes,
  mapDefaultTo,
  responseBody,
  noopThrows,
  compose,
  times,
  after,
} = transform;

const servicesDirectory = path.join(__dirname, "..", "__unmock__");

describe("Node.js interceptor", () => {
  describe("with state requests in place", () => {
    const nodeBackend = new NodeBackend({ servicesDirectory });
    const unmock = new UnmockPackage(nodeBackend);
    let petstore: Service;
    let filestackApi: Service;
    let slack: Service;

    beforeAll(() => {
      unmock.on();
      petstore = unmock.services.petstore;
      filestackApi = unmock.services.filestackApi;
      slack = unmock.services.slack;
    });
    afterAll(() => unmock.off());

    beforeEach(() => {
      petstore.reset();
      filestackApi.reset();
      slack.reset();
    });

    test("throws when asking for non existing method/path", async () => {
      try {
        await axios.post("http://petstore.swagger.io/v1/pets/3");
      } catch (e) {
        expect(e.message).toContain(
          "unmock error: Cannot find a matcher for this request",
        );
        return;
      }
      throw new Error("Shouldn't be here :(");
    });

    test("gets correct code upon request without other state", async () => {
      petstore.state(withCodes(200));
      const response = await axios("http://petstore.swagger.io/v1/pets");
      expect(response.status).toBe(200);
      expect(
        response.data.every(
          (pet: any) =>
            typeof pet.id === "number" && typeof pet.name === "string",
        ),
      ).toBeTruthy();
    });

    test("maps default correctly", async () => {
      petstore.state(mapDefaultTo(200), withCodes(200));
      const response = await axios("http://petstore.swagger.io/v1/pets");
      expect(response.status).toBe(200);
      expect(typeof response.data.message).toBe("string");
      expect(typeof response.data.code).toBe("number");
    });

    test("gets correct state after setting state with status code", async () => {
      petstore.state(
        withCodes(200),
        responseBody({ lens: [Arr, "id"] }).const(5),
      );
      const response = await axios("http://petstore.swagger.io/v1/pets");
      expect(response.status).toBe(200);
      expect(response.data.every((pet: any) => pet.id === 5)).toBeTruthy();
    });

    // Making sure the state is set correctly even if a status code is not given
    // (i.e. infering the correct operation from the responseBody without asking for a specific code)
    test("gets correct state after setting state without status code", async () => {
      petstore.state(
        mapDefaultTo(200),
        withoutCodes("default"),
        responseBody({ lens: ["message"] }).const("Hello World"),
      );
      const response = await axios("http://petstore.swagger.io/v1/pets");
      expect(response.status).toBe(200);
      expect(response.data.message).toEqual("Hello World");
    });

    test.skip("gets correct state after multiple overriden state requests", async () => {
      petstore.state(
        withCodes(200),
        responseBody({ path: /\/pets\/{3}/, lens: ["id"] }).const(3),
        responseBody({ path: /\/pets(\/\d+)/, lens: ["id"] }).const(5),
        responseBody({ path: "/pets", lens: [Arr, "id"] }).const(-1),
      );
      const response = await axios("http://petstore.swagger.io/v1/pets");
      expect(response.status).toBe(200);
      expect(response.data.every((pet: any) => pet.id === -1)).toBeTruthy();
      const response2 = await axios("http://petstore.swagger.io/v1/pets/3");
      expect(response2.status).toBe(200);
      expect(response2.data.id).toEqual(3);
      const response3 = await axios("http://petstore.swagger.io/v1/pets/4");
      expect(response3.status).toBe(200);
      expect(response3.data.id).toEqual(5);
    });

    test("gets correct state when setting textual response", async () => {
      filestackApi.state(withCodes(200), responseBody().const("foo"));
      const response = await axios("https://cloud.filestackapi.com/prefetch");
      expect(response.status).toBe(200);
      expect(response.data).toBe("foo");
    });

    test("gets correct state with query parameter when setting textual response", async () => {
      filestackApi.state(withCodes(200), responseBody().const("foo"));
      const response = await axios(
        "https://cloud.filestackapi.com/prefetch?apikey=fake",
      );
      expect(response.status).toBe(200);
      expect(response.data).toBe("foo");
    });

    test("gets correct state when setting textual response with path", async () => {
      filestackApi.state(
        withCodes(200),
        responseBody({ path: "/prefetch" }).const("bar"),
      );
      const response = await axios("https://cloud.filestackapi.com/prefetch");
      expect(response.status).toBe(200);
      expect(response.data).toBe("bar");
    });

    test("default response turns into 500", async () => {
      filestackApi.state(withCodes("default"), responseBody().const("foo"));
      try {
        await axios("https://cloud.filestackapi.com/prefetch");
        throw new Error("Expected a 500 response");
      } catch (err) {
        expect(err.response.status).toBe(500);
        expect(err.response.data).toBe("foo");
      }
    });

    test("sets an entire response from with request object", async () => {
      petstore.state(
        withCodes(200),
        (req: ISerializedRequest, o: OpenAPIObject) =>
          responseBody({ path: "/pets" }).schema({
            type: "string",
            enum: [req.host],
          })(req, o),
      );
      const response = await axios("http://petstore.swagger.io/v1/pets");
      expect(response.data).toBe("petstore.swagger.io");
    });

    // this is a no-op in the new version
    test("fails setting an array size for non-array elements", async () => {
      petstore.state(
        withCodes(200),
        noopThrows(
          responseBody({ path: "/pets", lens: [Arr, "id"] }).minItems(5),
        ),
        noopThrows(
          responseBody({ path: "/pets", lens: [Arr, "id"] }).maxItems(5),
        ),
      );
      try {
        await axios("http://petstore.swagger.io/v1/pets");
      } catch (err) {
        expect(err.message).toBe(
          "unmock error: Array item setting did not work",
        );
      }
    });

    test("updates times correctly", async () => {
      const text = "foo";
      const postMessage = () =>
        axios.post("https://slack.com/api/chat.postMessage", {
          data: { channel: "my_channel_id", text },
        });
      slack.state(
        withCodes(200),
        times(3)(
          responseBody({
            path: "/chat.postMessage",
            lens: ["message", "text"],
          }).const(text),
        ),
      );
      let resp = await postMessage();

      expect(resp.data.message.text).toEqual(text);
      resp = await postMessage();
      expect(resp.data.message.text).toEqual(text);
      resp = await postMessage();
      expect(resp.data.message.text).toEqual(text);
      resp = await postMessage();
      expect(resp.data.message.text).not.toEqual(text);
    });

    test("updates times after n", async () => {
      const text = "foo";
      const postMessage = () =>
        axios.post("https://slack.com/api/chat.postMessage", {
          data: { channel: "my_channel_id", text },
        });
      slack.state(
        withCodes(200),
        times(3)(
          after(3)(
            responseBody({
              path: "/chat.postMessage",
              lens: ["message", "text"],
            }).const(text),
          ),
        ),
      );

      let resp = await postMessage();
      expect(resp.data.message.text).not.toEqual(text);
      resp = await postMessage();
      expect(resp.data.message.text).not.toEqual(text);
      resp = await postMessage();
      expect(resp.data.message.text).not.toEqual(text);
      resp = await postMessage();
      expect(resp.data.message.text).toEqual(text);
      resp = await postMessage();
      expect(resp.data.message.text).toEqual(text);
      resp = await postMessage();
      expect(resp.data.message.text).toEqual(text);
      resp = await postMessage();
      expect(resp.data.message.text).not.toEqual(text);
    });

    test("handles 'properties' keyword correctly", async () => {
      const makeTransformer = (isCat: boolean) =>
        compose(
          withCodes(200),
          responseBody().required("properties"),
          responseBody({ lens: ["properties"] }).required("isCat"),
          responseBody({ lens: ["properties", "isCat"] }).const(isCat),
        );
      petstore.state(makeTransformer(true));
      let resp = await axios("http://petstore.swagger.io/v1/pets/54");
      expect(resp.data.properties.isCat).toBeTruthy();
      petstore.state(makeTransformer(false));
      resp = await axios("http://petstore.swagger.io/v1/pets/3");
      expect(resp.data.properties.isCat).toBeFalsy();
    });

    test("works with multiple codes", async () => {
      petstore.state(
        mapDefaultTo([404, 500]),
        withCodes([404, 500]),
        withoutCodes("default"), // TODO maybe we can remove the default by default? :rolleyes:
        responseBody().const("baz"),
      );
      try {
        await axios("http://petstore.swagger.io/v1/pets");
        throw new Error("Expected a 404 response");
      } catch (err) {
        expect([404, 500]).toContain(err.response.status);
        expect(err.response.data).toBe("baz");
      }
    });
  });
});
