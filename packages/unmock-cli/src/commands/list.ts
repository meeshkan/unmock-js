import { readFileSync } from "fs";
import glob from "glob";
import path from "path";
import { ILogger } from "unmock-core";
import { WinstonLogger } from "unmock-node";

const removeTrailingNumber = (s: string) =>
  s
    .split(" ")
    .slice(0, -1)
    .join(" ");

const SNAP_SUFFIX = ".snap";
const DEFAULT_SNAPSHOTS_FOLDER = ".snapshots";
interface IStringMap {
  [key: string]: string[];
}

export const listInternal = (logger: ILogger): Promise<undefined> => {
  return new Promise((resolve, reject) => {
    logger.log("Fetching mocks and relevant tests...");
    glob(
      `${process.cwd()}/**/${DEFAULT_SNAPSHOTS_FOLDER}/**/*${SNAP_SUFFIX}`,
      { dot: true },
      (e, matches) => {
        if (e) {
          reject(e);
          return;
        }
        matches.forEach((match) => {
          logger.log(path.basename(match, SNAP_SUFFIX));
          const snapshots = JSON.parse(readFileSync(match, "utf8"));
          const tests: IStringMap = Object.keys(snapshots).reduce(
            (obj: IStringMap, name) => {
              const key = removeTrailingNumber(name);
              (obj[key] = obj[key] || []).push(name);
              return obj;
            },
            {},
          );
          Object.keys(tests).forEach((test) => {
            logger.log(`  ${test}`);
            tests[test].forEach((call) => {
              logger.log(`    hash: ${snapshots[call].hash}`);
              logger.log(`      method: ${snapshots[call].method}`);
              logger.log(`      host: ${snapshots[call].host}`);
              logger.log(`      path: ${snapshots[call].path}`);
            });
          });
        });
        resolve();
      },
    );
  });
};

export const list = async () => {
  await listInternal(new WinstonLogger());
};
