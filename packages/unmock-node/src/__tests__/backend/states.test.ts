import axios from "axios";
import path from "path";
import { UnmockOptions } from "unmock-core";
import NodeBackend from "../../backend";

const servicesDirectory = path.join(__dirname, "..", "loaders", "resources");

describe("Node.js interceptor", () => {
  describe("with state requests in place", () => {
    let nodeInterceptor: NodeBackend;
    let states: any;

    beforeAll(() => {
      nodeInterceptor = new NodeBackend({ servicesDirectory });
      const unmockOptions = new UnmockOptions();
      nodeInterceptor.initialize(unmockOptions);
      states = nodeInterceptor.states;
    });

    afterAll(() => {
      nodeInterceptor.reset();
      states = undefined;
    });

    beforeEach(() => states.reset());

    test("gets successful response following state request", async () => {
      states.petstore({ $code: 200, id: 5 });
      const response = await axios("http://petstore.swagger.io/v1/pets");
      expect(response.status).toBe(200);
      expect(response.data.every((pet: any) => pet.id === 5)).toBeTruthy();
    });

    test("gets successful response following state request", async () => {
      states.petstore({ message: "Hello World" });
      const response = await axios("http://petstore.swagger.io/v1/pets");
      expect(response.status).toBe(200);
      expect(response.data.message).toEqual("Hello World");
    });
  });
});
