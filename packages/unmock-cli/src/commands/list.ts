import glob from "glob";
import path from "path";
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

export const list = () => {
  const logger = new WinstonLogger();
  logger.log("Fetching mocks and relevant tests...");
  glob(
    `${process.cwd()}/**/${DEFAULT_SNAPSHOTS_FOLDER}/**/*${SNAP_SUFFIX}`,
    { dot: true },
    (e, matches) => {
      if (e) {
        throw e;
      }
      matches.forEach((match) => {
        logger.log(path.basename(match, SNAP_SUFFIX));
        const snapshots = require(match);
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
    },
  );
};
