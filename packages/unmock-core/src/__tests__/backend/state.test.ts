import axios from "axios";
import { isEqual } from "lodash";
import * as path from "path";
import { Service, UnmockPackage } from "../..";
import NodeBackend from "../../backend";
import { includeCodes, changeToConst, responseBody, Arr, changeSingleSchema, changeMinItems, changeMaxItems, changeRequiredStatus } from "openapi-refinements";
import { OpenAPIObject } from "loas3/dist/generated/full";
import { ISerializedRequest } from "../../interfaces";

const servicesDirectory = path.join(__dirname, "..", "__unmock__");

describe("Node.js interceptor", () => {
  describe("with state requests in place", () => {
    const nodeInterceptor = new NodeBackend({ servicesDirectory });
    const unmock = new UnmockPackage(nodeInterceptor);
    let petstore: Service;
    let filestackApi: Service;

    beforeAll(() => {
      unmock.on();
      petstore = unmock.services.petstore;
      filestackApi = unmock.services.filestackApi;
    });
    afterAll(() => unmock.off());

    beforeEach(() => {
      petstore.reset();
      filestackApi.reset();
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
      petstore.state((_, o) => includeCodes(true, true, ["200"])(o));
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
      petstore.state((_, o) => [
        includeCodes(true, true, ["200"]),
        changeToConst(5)(responseBody(true), [Arr, "id"]),
      ].reduce((a, b) => b(a), o));
      const response = await axios("http://petstore.swagger.io/v1/pets");
      expect(response.status).toBe(200);
      expect(response.data.every((pet: any) => pet.id === 5)).toBeTruthy();
    });

    // not sure what this test in the original was trying to accomplish
    // there is no message field on 200...
    // also, we need to be explicit about 200 as there is also a default response
    test("t gets correct state after setting state without status code", async () => {
      petstore.state((_, o) => [
        includeCodes(true, true, ["200"]),
        changeSingleSchema(__ => ___ => ({
          type: "object",
          required: ["message"],
          properties: { message: { type: "string", enum: ["Hello World"]}}}))
          (responseBody("/pets", true, ["200"]), []),
      ].reduce((a, b) => b(a), o));
      const response = await axios("http://petstore.swagger.io/v1/pets");
      expect(response.status).toBe(200);
      expect(response.data.message).toEqual("Hello World");
    });

    test("t gets correct state after multiple overriden state requests", async () => {
      petstore.state((_, o) => [
        includeCodes(true, true, ["200"]),
        changeToConst(5)(responseBody(new RegExp("/pets")), [Arr, "id"]),
        changeToConst(-1)(responseBody(new RegExp("/pets/{[a-zA-Z0-9/]+}")), ["id"]),
      ].reduce((a, b) => b(a), o));
      const response = await axios("http://petstore.swagger.io/v1/pets");
      expect(response.status).toBe(200);
      expect(response.data.every((pet: any) => pet.id === 5)).toBeTruthy();
      const response2 = await axios("http://petstore.swagger.io/v1/pets/3");
      expect(response2.status).toBe(200);
      expect(response2.data.id).toEqual(-1);
    });

    test("t gets correct state when setting textual response", async () => {
      filestackApi.state((_, o) => [
        includeCodes(true, true, ["200"]),
        changeToConst("foo")(responseBody(new RegExp("[a-zA-Z0-9/]*"), true, ["200"], ["text/plain"]), []),
      ].reduce((a, b) => b(a), o));
      const response = await axios("https://cloud.filestackapi.com/prefetch");
      expect(response.status).toBe(200);
      expect(response.data).toBe("foo");
    });

    test("gets correct state with query parameter when setting textual response", async () => {
      filestackApi.state((_, o) => [
        includeCodes(true, true, ["200"]),
        changeToConst("foo")(responseBody(new RegExp("[a-zA-Z0-9/]*"), true, ["200"], ["text/plain"]), []),
      ].reduce((a, b) => b(a), o));
      const response = await axios(
        "https://cloud.filestackapi.com/prefetch?apikey=fake",
      );
      expect(response.status).toBe(200);
      expect(response.data).toBe("foo");
    });

    test("t gets correct state when setting textual response with path", async () => {
      filestackApi.state((_, o) => [
        includeCodes(true, true, ["200"]),
        changeToConst("bar")(responseBody(new RegExp("[a-zA-Z0-9/]*"), true, ["200"], ["text/plain"]), []),
      ].reduce((a, b) => b(a), o));
      const response = await axios("https://cloud.filestackapi.com/prefetch");
      expect(response.status).toBe(200);
      expect(response.data).toBe("bar");
    });

    test("t default response turns into 500", async () => {
      filestackApi.state((_, o) => [
        includeCodes(true, true, ["default"]),
        changeToConst("foo")(responseBody(new RegExp("[a-zA-Z0-9/]*"), true, ["default"], ["text/plain"]), []),
      ].reduce((a, b) => b(a), o));
      try {
        await axios("https://cloud.filestackapi.com/prefetch");
        throw new Error("Expected a 500 response");
      } catch (err) {
        expect(err.response.status).toBe(500);
        expect(err.response.data).toBe("foo");
      }
    });

    test("t sets an entire response from function", async () => {
      petstore.state((_, o) => [
        includeCodes(true, true, ["200"]),
        changeToConst([{id: 1, name: "Fluffy"}])(responseBody("/pets", true, ["200"]), []),
      ].reduce((a, b) => b(a), o));
      const response = await axios("http://petstore.swagger.io/v1/pets");
      expect(response.data).toEqual([{id: 1, name: "Fluffy"}]);
    });

    test("t sets an entire response from with request object", async () => {
      petstore.state((req, o) => [
        includeCodes(true, true, ["200"]),
        changeSingleSchema(__ => ___ => ({ type: "string", enum: [req.host]}))
          (responseBody("/pets", true, ["200"]), []),
      ].reduce((a, b) => b(a), o));
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
      const throwIfUnchanged = (f: (o: OpenAPIObject) => OpenAPIObject) => (o: OpenAPIObject): OpenAPIObject => {
        const out = f(o);
        if (isEqual(out, o)) {
          throw Error("Array item setting did not work");
        }
        return out;
      };
      petstore.state((_, o) => [
        includeCodes(true, true, ["200"]),
        throwIfUnchanged(changeMinItems(5)(responseBody(true), [Arr, "id"])),
        throwIfUnchanged(changeMaxItems(5)(responseBody(true), [Arr, "id"])),
      ].reduce((a, b) => b(a), o));
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
      const { slack } = unmock.services;
      const counter = { n: 0 };
      slack.state((_, o) => {
        counter.n += 1;
        return  [
          includeCodes(true, true, ["200"]),
          counter.n <= 3
          ? changeToConst(text)(responseBody("/chat.postMessage"), ["message", "text"])
          : (i: OpenAPIObject) => i,
        ].reduce((a, b) => b(a), o);
      });
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
      const makeTransformer = (isCat: boolean) => (_: ISerializedRequest, o: OpenAPIObject) =>  [
        includeCodes(true, true, ["200"]),
        changeRequiredStatus("properties")(responseBody(new RegExp("/pets/{[a-zA-Z0-9/]+}")), []),
        changeRequiredStatus("isCat")(responseBody(new RegExp("/pets/{[a-zA-Z0-9/]+}")), ["properties"]),
        changeToConst(isCat)(responseBody(new RegExp("/pets/{[a-zA-Z0-9/]+}")), ["properties", "isCat"]),
      ].reduce((a, b) => b(a), o);
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
