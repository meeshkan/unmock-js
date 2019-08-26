import path from "path";
import { FsServiceDefLoader } from "../fs-service-def-loader";
import { responseCreatorFactory } from "../generator";

const mockOptions = {
  flaky: () => false,
  isWhitelisted: (_: string) => false,
  log: (_: string) => undefined,
  useInProduction: () => false,
};

const serviceDefLoader = new FsServiceDefLoader({
  unmockDirectories: [path.join(__dirname, "__unmock__")],
});

describe("Tests generator", () => {
  it("loads all paths in __unmock__", () => {
    const { services } = responseCreatorFactory({
      serviceDefLoader,
      options: mockOptions,
    });
    services.slack.state({}); // should pass
    services.petstore.state({}); // should pass
    expect(() => services.github.state({})).toThrow(
      "property 'state' of undefined",
    ); // no github service
  });

  it("sets a state for swagger api converted to openapi", () => {
    const { services } = responseCreatorFactory({
      serviceDefLoader,
      options: mockOptions,
    });
    services.slack.state("/bots.info", { bot: { app_id: "A12345678" } }); // should pass
    expect(() =>
      services.slack.state("/bots.info", { bot: { app_id: "A123456789" } }),
    ).toThrow("type is incorrect"); // Does not match the specified pattern
  });

  it("in non-flaky mode", () => {
    const { createResponse } = responseCreatorFactory({
      serviceDefLoader,
      options: mockOptions,
    });
    for (let i = 0; i < 50; i++) {
      const resp = createResponse({
        host: "petstore.swagger.io",
        method: "post",
        path: "/v1/pets",
        protocol: "http",
      });
      expect(resp).toBeDefined();
      if (resp !== undefined) {
        // Only used for type-checking...
        expect(resp.statusCode).toEqual(201);
      }
    }
  });

  it("in flaky mode", () => {
    const { createResponse } = responseCreatorFactory({
      serviceDefLoader,
      options: { ...mockOptions, flaky: () => true },
    });
    const counters: { [code: number]: number } = { 200: 0, 201: 0 };
    for (let i = 0; i < 100; i++) {
      const resp = createResponse({
        host: "petstore.swagger.io",
        method: "post",
        path: "/v1/pets",
        protocol: "http",
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
    const { services, createResponse } = responseCreatorFactory({
      serviceDefLoader,
      options: mockOptions,
    });
    services.filestackApi.state("/prefetch", "prefetch");
    let resp = createResponse({
      host: "cloud.filestackapi.com",
      method: "options",
      path: "/prefetch",
      protocol: "https",
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
      protocol: "https",
    });
    expect(resp).toBeDefined();
    if (resp !== undefined) {
      expect(resp.statusCode).toEqual(200);
      expect(resp.body).toEqual('"prefetch"');
    }
  });

  it("Sets a state with a function and generates accordingly", () => {
    const { services, createResponse } = responseCreatorFactory({
      serviceDefLoader,
      options: mockOptions,
    });
    services.petstore.state({ id: () => "foo", $size: 5, $code: 200 });
    let resp = createResponse({
      host: "petstore.swagger.io",
      method: "get",
      path: "/v1/pets",
      protocol: "http",
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
      protocol: "http",
    });
    expect(resp).toBeDefined();
    if (resp && resp.body !== undefined) {
      JSON.parse(resp.body).forEach((pet: any) => expect(pet.id).toEqual(1));
    } else {
      throw new Error("Response body was undefined?");
    }
  });
});
