import * as fs from "fs";
import * as path from "path";

export const readJson = (pathToJson: string): any => {
  const fullpath = path.isAbsolute(pathToJson)
    ? pathToJson
    : path.resolve(__dirname, pathToJson);
  const fileContents = fs.readFileSync(fullpath, { encoding: "utf-8" });
  return JSON.parse(fileContents);
};
