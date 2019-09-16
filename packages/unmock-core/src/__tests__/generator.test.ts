import * as path from "path";
import NodeBackend from "../backend/index";
import { responseCreatorFactory } from "../generator";

const mockOptions = {
  flaky: () => false,
  isWhitelisted: (_: string) => false,
  log: (_: string) => undefined,
  useInProduction: () => false,
};

const backend = new NodeBackend({
  servicesDirectory: path.join(__dirname, "__unmock__"),
});
const services = backend.services;

describe("Tests generator", () => {
  it("in non-flaky mode", () => {
    const createResponse = responseCreatorFactory({
      options: mockOptions,
      store: backend.serviceStore,
    });
    for (let i = 0; i < 50; i++) {
      const resp = createResponse({
        host: "petstore.swagger.io",
        method: "post",
        path: "/v1/pets",
        pathname: "/v1/pets",
        protocol: "http",
        query: {},
      });
      expect(resp).toBeDefined();
      if (resp !== undefined) {
        // Only used for type-checking...
        expect(resp.statusCode).toEqual(201);
      }
    }
  });

  it("in flaky mode", () => {
    const createResponse = responseCreatorFactory({
      options: { ...mockOptions, flaky: () => true },
      store: backend.serviceStore,
    });
    const counters: { [code: number]: number } = { 200: 0, 201: 0 };
    for (let i = 0; i < 100; i++) {
      const resp = createResponse({
        host: "petstore.swagger.io",
        method: "post",
        path: "/v1/pets",
        pathname: "/v1/pets",
        protocol: "http",
        query: {},
      });
      expect(resp).toBeDefined();
      if (resp !== undefined) {
        // Only used for type-checking...
        const code: number = resp.statusCode;
        counters[code] += 1;
      }
    }
    expect(counters[200]).toBeGreaterThan(0);
    expect(counters[201]).toBeGreaterThan(0);
  });

  it("Generates correct response from differing status codes", () => {
    const createResponse = responseCreatorFactory({
      options: mockOptions,
      store: backend.serviceStore,
    });
    services.filestackApi.state("/prefetch", "prefetch");
    let resp = createResponse({
      host: "cloud.filestackapi.com",
      method: "options",
      path: "/prefetch",
      pathname: "/prefetch",
      protocol: "https",
      query: {},
    });
    expect(resp).toBeDefined();
    if (resp !== undefined) {
      expect(resp.statusCode).toEqual(204);
      expect(resp.body).toEqual('"prefetch"');
    }

    resp = createResponse({
      host: "cloud.filestackapi.com",
      method: "get",
      path: "/prefetch",
      pathname: "/prefetch",
      protocol: "https",
      query: {},
    });
    expect(resp).toBeDefined();
    if (resp !== undefined) {
      expect(resp.statusCode).toEqual(200);
      expect(resp.body).toEqual('"prefetch"');
    }
  });

  it("Sets a state with a function and generates accordingly", () => {
    const createResponse = responseCreatorFactory({
      options: mockOptions,
      store: backend.serviceStore,
    });
    services.petstore.state({ id: () => "foo", $size: 5, $code: 200 });
    let resp = createResponse({
      host: "petstore.swagger.io",
      method: "get",
      path: "/v1/pets",
      pathname: "/v1/pets",
      protocol: "http",
      query: {},
    });
    expect(resp).toBeDefined();
    if (resp && resp.body !== undefined) {
      JSON.parse(resp.body).forEach((pet: any) =>
        expect(pet.id).toEqual("foo"),
      );
    } else {
      throw new Error("Response body was undefined?");
    }

    services.petstore.state({ id: () => 1 });
    resp = createResponse({
      host: "petstore.swagger.io",
      method: "get",
      path: "/v1/pets",
      pathname: "/v1/pets",
      protocol: "http",
      query: {},
    });
    expect(resp).toBeDefined();
    if (resp && resp.body !== undefined) {
      JSON.parse(resp.body).forEach((pet: any) => expect(pet.id).toEqual(1));
    } else {
      throw new Error("Response body was undefined?");
    }
  });
});
