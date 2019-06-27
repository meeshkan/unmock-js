import axios from "axios";
import path from "path";
import { UnmockOptions } from "unmock-core";
import NodeBackend from "../../backend";

const servicesDirectory = path.join(__dirname, "..", "loaders", "resources");

describe("Node.js interceptor", () => {
  describe("with petstore in place", () => {
    let nodeInterceptor: NodeBackend;
    beforeEach(() => {
      nodeInterceptor = new NodeBackend({ servicesDirectory });
      const unmockOptions = new UnmockOptions();
      nodeInterceptor.initialize(unmockOptions);
    });
    afterEach(() => {
      nodeInterceptor.reset();
    });
    test("gets successful response", async () => {
      const response = await axios("http://petstore.swagger.io/v1/pets");
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
    });
  });
});
