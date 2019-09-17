import axios from "axios";
import * as path from "path";
import { Service, UnmockPackage } from "../..";
import NodeBackend from "../../backend";
import { Arr } from "openapi-refinements";
import { OpenAPIObject } from "loas3/dist/generated/full";
import { gen } from "../../generator-utils";
import { ISerializedRequest } from "../../interfaces";

const { withCodes, responseBody, noopThrows, compose, times } = gen;

const servicesDirectory = path.join(__dirname, "..", "__unmock__");

describe("Node.js interceptor", () => {
  describe("with state requests in place", () => {
    const nodeInterceptor = new NodeBackend({ servicesDirectory });
    const unmock = new UnmockPackage(nodeInterceptor);
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

    test("t throws when asking for non existing method/path", async () => {
      try {
        await axios.post("http://petstore.swagger.io/v1/pets/3");
      } catch (e) {
        expect(e.message).toContain("unmock error: Cannot find a matcher for this request");
        return;
      }
      throw new Error("Shouldn't be here :(");
    });

    test("t gets correct code upon request without other state", async () => {
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

    test("t gets correct state after setting state with status code", async () => {
      petstore.state(
        withCodes(200),
        responseBody({ address: [Arr, "id"] }).const(5),
      );
      const response = await axios("http://petstore.swagger.io/v1/pets");
      expect(response.status).toBe(200);
      expect(response.data.every((pet: any) => pet.id === 5)).toBeTruthy();
    });

    // not sure what this test in the original was trying to accomplish
    // there is no message field on 200...
    // also, we need to be explicit about 200 as there is also a default response
    test("t gets correct state after setting state without status code", async () => {
      petstore.state(
        withCodes(200),
        responseBody({ path: "/pets" }).schema({
          type: "object",
          required: ["message"],
          properties: { message: { type: "string", enum: ["Hello World"]}}}),
      );
      const response = await axios("http://petstore.swagger.io/v1/pets");
      expect(response.status).toBe(200);
      expect(response.data.message).toEqual("Hello World");
    });

    test("t gets correct state after multiple overriden state requests", async () => {
      petstore.state(
        withCodes(200),
        responseBody({ path: "/pets", address: [Arr, "id"] }).const(5),
        responseBody({ path: /\/pets\/{[a-zA-Z0-9/]+}/, address: ["id"] }).const(-1),
      );
      const response = await axios("http://petstore.swagger.io/v1/pets");
      expect(response.status).toBe(200);
      expect(response.data.every((pet: any) => pet.id === 5)).toBeTruthy();
      const response2 = await axios("http://petstore.swagger.io/v1/pets/3");
      expect(response2.status).toBe(200);
      expect(response2.data.id).toEqual(-1);
    });

    test("t gets correct state when setting textual response", async () => {
      filestackApi.state(
        withCodes(200),
        responseBody().const("foo"),
      );
      const response = await axios("https://cloud.filestackapi.com/prefetch");
      expect(response.status).toBe(200);
      expect(response.data).toBe("foo");
    });

    test("gets correct state with query parameter when setting textual response", async () => {
      filestackApi.state(
        withCodes(200),
        responseBody().const("foo"),
      );
      const response = await axios(
        "https://cloud.filestackapi.com/prefetch?apikey=fake",
      );
      expect(response.status).toBe(200);
      expect(response.data).toBe("foo");
    });

    test("t gets correct state when setting textual response with path", async () => {
      filestackApi.state(
        withCodes(200),
        responseBody({ path: "/prefetch" }).const("bar"),
      );
      const response = await axios("https://cloud.filestackapi.com/prefetch");
      expect(response.status).toBe(200);
      expect(response.data).toBe("bar");
    });

    test("t default response turns into 500", async () => {
      filestackApi.state(
        withCodes("default"),
        responseBody().const("foo"),
      );
      try {
        await axios("https://cloud.filestackapi.com/prefetch");
        throw new Error("Expected a 500 response");
      } catch (err) {
        expect(err.response.status).toBe(500);
        expect(err.response.data).toBe("foo");
      }
    });

    test("t sets an entire response from function", async () => {
      petstore.state(
        withCodes(200),
        responseBody({ path: "/pets" }).const([{id: 1, name: "Fluffy"}]),
      );
      const response = await axios("http://petstore.swagger.io/v1/pets");
      expect(response.data).toEqual([{id: 1, name: "Fluffy"}]);
    });

    test("t sets an entire response from with request object", async () => {
      petstore.state(
        withCodes(200),
        (req: ISerializedRequest, o: OpenAPIObject) =>
          responseBody({ path: "/pets" })
            .schema({ type: "string", enum: [req.host]})(req, o),
      );
      const response = await axios("http://petstore.swagger.io/v1/pets");
      expect(response.data).toBe("petstore.swagger.io");
    });

    test("sets an entire response from function with DSL", async () => {
      petstore.state((_, __) => ({
        openapi: "",
        info: { title: "", version: ""},
        paths: {
          "/pets": {
            description: "",
            get: {
              responses: {
                404: {
                  description: "",
                  content: {
                    "text/plain": {
                      schema: {
                        type: "string",
                        enum: ["baz"],
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }));
      try {
        await axios("http://petstore.swagger.io/v1/pets");
        throw new Error("Expected a 404 response");
      } catch (err) {
        expect(err.response.status).toBe(404);
        expect(err.response.data).toBe("baz");
      }
    });

    // this is just a no-op in the new version
    test("t fails setting an array size for non-array elements", async () => {
      petstore.state(
        withCodes(200),
        noopThrows(responseBody({ path: "/pets", address: [Arr, "id"] }).minItems(5)),
        noopThrows(responseBody({ path: "/pets", address: [Arr, "id"] }).maxItems(5)),
      );
      try {
        await axios("http://petstore.swagger.io/v1/pets");
      } catch (err) {
        expect(err.message).toBe("unmock error: Array item setting did not work");
      }
    });

    test("t updates times correctly", async () => {
      const text = "foo";
      const postMessage = () =>
        axios.post("https://slack.com/api/chat.postMessage", {
          data: { channel: "my_channel_id", text },
        });
      slack.state(
        withCodes(200),
        times(3)(responseBody({
          path: "/chat.postMessage",
          address: ["message", "text"],
        }).const(text)));
      let resp = await postMessage();

      expect(resp.data.message.text).toEqual(text);
      resp = await postMessage();
      expect(resp.data.message.text).toEqual(text);
      resp = await postMessage();
      expect(resp.data.message.text).toEqual(text);
      resp = await postMessage();
      expect(resp.data.message.text).not.toEqual(text);
    });

    test("handles 'properties' keyword correctly", async () => {
      const makeTransformer = (isCat: boolean) => compose(
        withCodes(200),
        responseBody().required("properties"),
        responseBody({address: ["properties"]}).required("isCat"),
        responseBody({address: ["properties", "isCat"]}).const(isCat),
      );
      petstore.state(makeTransformer(true));
      let resp = await axios("http://petstore.swagger.io/v1/pets/54");
      expect(resp.data.properties.isCat).toBeTruthy();
      petstore.state(makeTransformer(false));
      resp = await axios("http://petstore.swagger.io/v1/pets/3");
      expect(resp.data.properties.isCat).toBeFalsy();
    });

    test("t works with multiple codes", async () => {
      petstore.state((_, __) => ({
        openapi: "",
        info: { title: "", version: ""},
        paths: {
          "/pets": {
            description: "",
            get: {
              responses: {
                404: {
                  description: "",
                  content: {
                    "text/plain": {
                      schema: {
                        type: "string",
                        enum: ["baz"],
                      },
                    },
                  },
                },
                500: {
                  description: "",
                  content: {
                    "text/plain": {
                      schema: {
                        type: "string",
                        enum: ["baz"],
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }));
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