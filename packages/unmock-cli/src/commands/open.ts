import * as child_process from "child_process";
import * as glob from "glob";
import WinstonLogger from "../logger";

export const open = (hash: string, options: any) => {
  const logger = new WinstonLogger();
  const editor = options.editor || process.env.EDITOR || "vi";
  glob(
    `${process.cwd()}/**/${hash}/response.json`,
    { dot: true, nosort: true },
    (e, matches) => {
      if (e || matches.length !== 1) {
        logger.log(
          e || matches.length === 0
            ? `Could not find ${hash}`
            : `Too many matches: ${matches}`,
        );
        return;
      }
      const path = matches[0];
      const child = child_process.spawn(editor, [path], {
        stdio: "inherit",
      });
      child.on("exit", () => {
        logger.log(`Done editing ${hash}.`);
      });
    },
  );
};
