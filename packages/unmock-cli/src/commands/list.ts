import glob from "glob";
import path from "path";
import { WinstonLogger } from "unmock-node";

const removeTrailingNumber = (s: string) =>
  s
    .split(" ")
    .slice(0, -1)
    .join(" ");

const SNAP_SUFFIX = ".snap";
const DEFAULT_SNAPSHOTS_FOLDER = "__snapshots__";

export const list = () => {
  const logger = new WinstonLogger();
  glob(
    `${process.cwd()}/${DEFAULT_SNAPSHOTS_FOLDER}/**/*${SNAP_SUFFIX}`,
    (e, matches) => {
      if (e) {
        throw e;
      }
      matches.forEach((match) => {
        logger.log(path.basename(match, SNAP_SUFFIX));
        const snapshots = require(`${process.cwd()}/${match}`);
        const tests = Object.keys(snapshots)
          .map((name) => ({ [removeTrailingNumber(name)]: new Array<string>() }))
          .reduce((a, b) => ({ ...a, ...b }), {});
        Object.keys(snapshots).forEach((name) => {
          tests[removeTrailingNumber(name)].push(name);
        });
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
