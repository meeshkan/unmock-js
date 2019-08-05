import axios from "axios";
import path from "path";
import { CorePackage } from "unmock-core";
import { dsl } from "../..";
import NodeBackend from "../../backend";

class StateTestPackage extends CorePackage {
  public states() {
    return (this.backend as NodeBackend).states;
  }
}

const servicesDirectory = path.join(__dirname, "..", "resources");

describe("Node.js interceptor", () => {
  describe("with state requests in place", () => {
    let nodeInterceptor: NodeBackend;
    let unmock: StateTestPackage;
    let states: any;

    beforeAll(() => {
      nodeInterceptor = new NodeBackend({ servicesDirectory });
      unmock = new StateTestPackage(nodeInterceptor);
      states = unmock.on();
    });

    afterAll(() => {
      unmock.off();
      states = undefined;
    });

    beforeEach(() => states.reset());

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
      states.petstore({ $code: 200 });
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
      states.petstore({ $code: 200, id: 5 });
      const response = await axios("http://petstore.swagger.io/v1/pets");
      expect(response.status).toBe(200);
      expect(response.data.every((pet: any) => pet.id === 5)).toBeTruthy();
    });

    test("gets correct state after setting state without status code", async () => {
      states.petstore({ message: "Hello World" });
      const response = await axios("http://petstore.swagger.io/v1/pets");
      expect(response.status).toBe(200);
      expect(response.data.message).toEqual("Hello World");
    });

    test("gets correct state after multiple overriden state requests", async () => {
      states.petstore({ id: -1 }).get("/pets", { id: 5 });
      const response = await axios("http://petstore.swagger.io/v1/pets");
      expect(response.status).toBe(200);
      expect(response.data.every((pet: any) => pet.id === 5)).toBeTruthy();
      const response2 = await axios("http://petstore.swagger.io/v1/pets/3");
      expect(response2.status).toBe(200);
      expect(response2.data.every((pet: any) => pet.id === -1)).toBeTruthy();
    });

    test("gets correct state when setting textual response", async () => {
      states.petstore("foo");
      const response = await axios("http://petstore.swagger.io/v1/pets");
      expect(response.status).toBe(200);
      expect(response.data).toBe("foo");
    });

    test("gets correct state when setting textual response with path", async () => {
      states.petstore("/pets", "bar");
      const response = await axios("http://petstore.swagger.io/v1/pets");
      expect(response.status).toBe(200);
      expect(response.data).toBe("bar");
    });

    test("uses default response when setting textual response with DSL with non-existing status code", async () => {
      states.petstore(dsl.textResponse("foo", { $code: 400 }));
      try {
        await axios("http://petstore.swagger.io/v1/pets");
        throw new Error("Expected a 400 response");
      } catch (err) {
        expect(err.response.status).toBe(400);
        expect(err.response.data).toBe("foo");
      }
    });

    test("sets an entire response from function", async () => {
      states.petstore(() => "baz");
      const response = await axios("http://petstore.swagger.io/v1/pets");
      expect(response.data).toBe("baz");
    });

    test("should set an entire response from function returning string with path", async () => {
      // Maybe the correct way to do this would be
      // states.petstore("/pets", () => "baz"),
      // but if that's required (removing base path) then this should not pass the input validation?
      states.petstore("/v1/pets", () => "baz");
      const response = await axios("http://petstore.swagger.io/v1/pets");
      expect(response.data).toBe("baz");
    });

    test("should set an entire response from function returning string with any path", async () => {
      states.petstore("**", () => "baz");
      const response = await axios("http://petstore.swagger.io/v1/pets");
      expect(response.data).toBe("baz");
    });

    test("sets an entire response from function with DSL", async () => {
      states.petstore(dsl.functionResponse(() => "baz", { $code: 404 }));
      try {
        await axios("http://petstore.swagger.io/v1/pets");
        throw new Error("Expected a 404 response");
      } catch (err) {
        expect(err.response.status).toBe(404);
        expect(err.response.data).toBe("baz");
      }
    });

    test("fails setting an array size for non-array elements", async () => {
      expect(() => states.petstore({ id: { $size: 5 } })).toThrow("$size");
    });
  });
});
