import glob from "glob";
import { WinstonLogger } from "unmock-node";

const removeTrailingNumber = (s: string) => s.split(" ").slice(0, -1).join(" ");

export default () => {
  const logger = new WinstonLogger();
  glob("__snapshots__/**/*.snap", (e, matches) => {
    if (e) {
      throw e;
    }
    matches.forEach((match) => {
      logger.log(match.substring(0, match.length - 5).substring(14));
      const snapshots = require(`${process.cwd()}/${match}`);
      const tests = Object.keys(snapshots)
        .map(name => ({[removeTrailingNumber(name)]: new Array<string>()}))
        .reduce((a, b) => ({ ...a, ...b}), {});
      Object.keys(snapshots)
        .forEach(name => {
          tests[removeTrailingNumber(name)].push(name);
        });
      Object.keys(tests)
        .forEach(test => {
          logger.log(`  ${test}`);
          tests[test].forEach(call => {
            logger.log(`    hash: ${snapshots[call].hash}`);
            logger.log(`      method: ${snapshots[call].method}`);
            logger.log(`      host: ${snapshots[call].host}`);
            logger.log(`      path: ${snapshots[call].path}`);
          });
        });
    });
  });
};
