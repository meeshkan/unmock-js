import axios from "axios";
import path from "path";
import { UnmockOptions } from "unmock-core";
import NodeBackend from "../../backend";

const servicesDirectory = path.join(__dirname, "..", "loaders", "resources");

describe("Node.js interceptor", () => {
  describe("with petstore in place", () => {
    let nodeInterceptor: NodeBackend;
    beforeAll(() => {
      nodeInterceptor = new NodeBackend({ servicesDirectory });
      const unmockOptions = new UnmockOptions();
      nodeInterceptor.initialize(unmockOptions);
    });
    afterAll(() => {
      nodeInterceptor.reset();
    });
    test("gets successful response or petstore", async () => {
      const response = await axios("http://petstore.swagger.io/v1/pets");
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
    });
    test("emits an error for unknown url", async () => {
      try {
        await axios("http://example.org");
      } catch (err) {
        expect(err.message).toBe("No matching template found");
        return;
      }
      throw new Error("Should not get here");
    });
  });
});
