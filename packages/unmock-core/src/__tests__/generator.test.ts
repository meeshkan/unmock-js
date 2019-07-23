import fs from "fs";
import path from "path";
import { IServiceDefLoader, responseCreatorFactory } from "..";

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
    });
    stateStore.slack(); // should pass
    stateStore.petstore(); // should pass
    expect(() => stateStore.github()).toThrow("service named 'github'"); // no github service
  });

  it("sets a state for swagger api converted to openapi", () => {
    const { stateStore } = responseCreatorFactory({
      serviceDefLoader,
    });
    stateStore.slack("/bots.info", { bot: { app_id: "A12345678" } }); // should pass

    expect(() =>
      stateStore.slack("/bots.info", { bot: { app_id: "A123456789" } }),
    ).toThrow("type is incorrect"); // Does not match the specified pattern
  });
});
