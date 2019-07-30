import fs from "fs";
import path from "path";
import { IServiceDefLoader, responseCreatorFactory } from "..";

const mockOptions = {
  flaky: () => false,
  isWhitelisted: (_: string) => false,
  log: (_: string) => undefined,
  useInProduction: () => false,
};

const serviceDefLoader: IServiceDefLoader = {
  load: () => Promise.all(serviceDefLoader.loadSync()),
  loadSync: () => {
    const servicesDirectory: string = path.join(__dirname, "__unmock__");
    const serviceDirectories = fs
      .readdirSync(servicesDirectory)
      .map((f: string) => path.join(servicesDirectory, f))
      .filter((f: string) => fs.statSync(f).isDirectory());

    return serviceDirectories.map((dir: string) => ({
      absolutePath: dir,
      directoryName: path.basename(dir),
      serviceFiles: fs
        .readdirSync(dir)
        .map((fileName: string) => path.join(dir, fileName))
        .filter((fileName: string) => fs.statSync(fileName).isFile())
        .map((f: string) => ({
          basename: path.basename(f),
          contents: fs.readFileSync(f).toString("utf-8"),
        })),
    }));
  },
};

describe("Tests generator", () => {
  it("loads all paths in __unmock__", () => {
    const { stateStore } = responseCreatorFactory({
      serviceDefLoader,
      options: mockOptions,
    });
    stateStore.slack({}); // should pass
    stateStore.petstore({}); // should pass
    expect(() => stateStore.github({})).toThrow("service named 'github'"); // no github service
  });

  it("sets a state for swagger api converted to openapi", () => {
    const { stateStore } = responseCreatorFactory({
      serviceDefLoader,
      options: mockOptions,
    });
    stateStore.slack("/bots.info", { bot: { app_id: "A12345678" } }); // should pass

    expect(() =>
      stateStore.slack("/bots.info", { bot: { app_id: "A123456789" } }),
    ).toThrow("type is incorrect"); // Does not match the specified pattern
  });

  it("in non-flaky mode", () => {
    const { createResponse } = responseCreatorFactory({
      serviceDefLoader,
      options: mockOptions,
    });
    for (let i = 0; i < 50; i++) {
      expect(
        createResponse({
          host: "petstore.swagger.io",
          method: "post",
          path: "/v1/pets",
          protocol: "http",
        }).statusCode,
      ).toEqual(201);
    }
  });

  it("in flaky mode", () => {
    const { createResponse } = responseCreatorFactory({
      serviceDefLoader,
      options: { ...mockOptions, flaky: () => true },
    });
    const counters: { [code: number]: number } = { 200: 0, 201: 0 };
    for (let i = 0; i < 100; i++) {
      const code: number = createResponse({
        host: "petstore.swagger.io",
        method: "post",
        path: "/v1/pets",
        protocol: "http",
      }).statusCode;
      counters[code] += 1;
    }
    expect(counters[200]).toBeGreaterThan(0);
    expect(counters[201]).toBeGreaterThan(0);
  });
});
