import child_process from "child_process";
import fs from "fs";
import { WinstonLogger } from "unmock-node";

export default (hash: string, options: any) => {
  const logger = new WinstonLogger();
  const editor = options.editor || process.env.EDITOR || "vi";
  const path = `${process.cwd()}/.unmock/save/${hash}/response.json`;
  if (fs.existsSync(path)) {
    const child = child_process.spawn(editor, [path], {
        stdio: "inherit",
    });
    child.on("exit", () => {
      logger.log(`Done editing ${hash}.`);
    });
  } else {
    logger.log(`Could not find ${hash}`);
  }
};
