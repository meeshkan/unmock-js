import axios from "axios";
import path from "path";
import { CorePackage } from "unmock-core";
import { dsl, Service, UnmockRequest } from "../../..";
import NodeBackend from "../../backend";

const servicesDirectory = path.join(__dirname, "..", "resources");

describe("Node.js interceptor", () => {
  describe("with state requests in place", () => {
    const nodeInterceptor = new NodeBackend({ servicesDirectory });
    const unmock = new CorePackage(nodeInterceptor);
    let petstore: Service;

    beforeAll(() => {
      petstore = unmock.on().services.petstore;
    });
    afterAll(() => {
      unmock.off();
    });

    beforeEach(() =>
      Object.values(unmock.services).forEach((core: Service) =>
        core.state.reset(),
      ),
    );

    test("Throws when asking for non existing method/path", async () => {
      try {
        await axios.post("http://petstore.swagger.io/v1/pets/3");
      } catch (e) {
        expect(e.message).toContain("No matching template found");
        return;
      }
      throw new Error("Shouldn't be here :(");
    });

    test("gets correct code upon request without other state", async () => {
      petstore.state({ $code: 200 });
      const response = await axios("http://petstore.swagger.io/v1/pets");
      expect(response.status).toBe(200);
      expect(
        response.data.every(
          (pet: any) =>
            typeof pet.id === "number" && typeof pet.name === "string",
        ),
      ).toBeTruthy();
    });

    test("gets correct state after setting state with status code", async () => {
      petstore.state({ $code: 200, id: 5 });
      const response = await axios("http://petstore.swagger.io/v1/pets");
      expect(response.status).toBe(200);
      expect(response.data.every((pet: any) => pet.id === 5)).toBeTruthy();
    });

    test("gets correct state after setting state without status code", async () => {
      petstore.state({ message: "Hello World" });
      const response = await axios("http://petstore.swagger.io/v1/pets");
      expect(response.status).toBe(200);
      expect(response.data.message).toEqual("Hello World");
    });

    test("gets correct state after multiple overriden state requests", async () => {
      petstore.state({ id: -1 }).get("/pets", { id: 5 });
      const response = await axios("http://petstore.swagger.io/v1/pets");
      expect(response.status).toBe(200);
      expect(response.data.every((pet: any) => pet.id === 5)).toBeTruthy();
      const response2 = await axios("http://petstore.swagger.io/v1/pets/3");
      expect(response2.status).toBe(200);
      expect(response2.data.every((pet: any) => pet.id === -1)).toBeTruthy();
    });

    test("gets correct state when setting textual response", async () => {
      petstore.state("foo");
      const response = await axios("http://petstore.swagger.io/v1/pets");
      expect(response.status).toBe(200);
      expect(response.data).toBe("foo");
    });

    test("gets correct state when setting textual response with path", async () => {
      petstore.state("/pets", "bar");
      const response = await axios("http://petstore.swagger.io/v1/pets");
      expect(response.status).toBe(200);
      expect(response.data).toBe("bar");
    });

    test("uses default response when setting textual response with DSL with non-existing status code", async () => {
      petstore.state(dsl.textResponse("foo", { $code: 400 }));
      try {
        await axios("http://petstore.swagger.io/v1/pets");
        throw new Error("Expected a 400 response");
      } catch (err) {
        expect(err.response.status).toBe(400);
        expect(err.response.data).toBe("foo");
      }
    });

    test("sets an entire response from function", async () => {
      petstore.state(() => "baz");
      const response = await axios("http://petstore.swagger.io/v1/pets");
      expect(response.data).toBe("baz");
    });

    test("sets an entire response from with request object", async () => {
      petstore.state((req: UnmockRequest) => req.host);
      const response = await axios("http://petstore.swagger.io/v1/pets");
      expect(response.data).toBe("petstore.swagger.io");
    });

    test("sets an entire response from function with DSL", async () => {
      petstore.state(dsl.functionResponse(() => "baz", { $code: 404 }));
      try {
        await axios("http://petstore.swagger.io/v1/pets");
        throw new Error("Expected a 404 response");
      } catch (err) {
        expect(err.response.status).toBe(404);
        expect(err.response.data).toBe("baz");
      }
    });

    test("fails setting an array size for non-array elements", async () => {
      expect(() => petstore.state({ id: { $size: 5 } })).toThrow("$size");
    });

    it("Updates $times correctly", async () => {
      const postMessage = (text: string) =>
        axios.post("https://slack.com/api/chat.postMessage", {
          data: { channel: "my_channel_id", text },
        });
      const text = "foo";
      const { slack } = unmock.services;

      slack.state.post("/chat.postMessage", { message: { text }, $times: 3 });
      let resp = await postMessage(text);

      expect(resp.data.message.text).toEqual(text);
      resp = await postMessage(text);
      expect(resp.data.message.text).toEqual(text);
      resp = await postMessage(text);
      expect(resp.data.message.text).toEqual(text);
      resp = await postMessage(text);
      expect(resp.data.message.text).not.toEqual(text);
    });
  });
});
