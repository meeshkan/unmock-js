import axios from "axios";
import path from "path";
import { CorePackage, dsl, UnmockOptions } from "unmock-core";
import NodeBackend from "../../backend";

class StateTestPackage extends CorePackage {
  public states() {
    return (this.backend as NodeBackend).states;
  }
}

const servicesDirectory = path.join(__dirname, "..", "loaders", "resources");

describe("Node.js interceptor", () => {
  describe("with state requests in place", () => {
    let nodeInterceptor: NodeBackend;
    let unmock: CorePackage;
    let states: any;

    beforeAll(() => {
      nodeInterceptor = new NodeBackend({ servicesDirectory });
      const unmockOptions = new UnmockOptions();
      unmock = new StateTestPackage(unmockOptions, nodeInterceptor);
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

    test("gets correct state when setting textual middleware", async () => {
      states.petstore(dsl.textResponse("foo"));
      const response = await axios("http://petstore.swagger.io/v1/pets");
      expect(response.status).toBe(200);
      expect(response.data).toBe("foo");
    });

    test("throws when setting textual middleware with DSL with non-existing status code", async () => {
      expect(() =>
        states.petstore(dsl.textResponse("foo", { $code: 400 })),
      ).toThrow("status code '400'");
    });
  });
});
