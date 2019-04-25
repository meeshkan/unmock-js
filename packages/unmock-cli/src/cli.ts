#!/usr/bin/env node

import axios from "axios";
import child_process from "child_process";
import program from "commander";
import fs from "fs";
import glob from "glob";
import { unmock, WinstonLogger } from "unmock-node";

const collect = (val: string, memo: string[]) => {
  memo.push(val);
  return memo;
};

program
  .usage("unmock <command>");

program
  .command("curl <url>")
  .option("-d, --data [data]", "HTTP POST data")
  .option(
    "-H, --header [header]",
    "Pass custom header(s) to server",
    collect,
    [],
  )
  .option("-X", "--request [command]", "Specify request command to use")
  .option(
    "-S",
    "--signature [signature]",
    "Specify a signature for a request in tokenless mode",
  )
  .action(async (url, options) => {
    const makeHeaders = (headers: string[]) =>
      headers
        .map(h => ({
          [h.substring(0, h.indexOf(":")).trim()]: h
            .substring(h.indexOf(":") + 1)
            .trim(),
        }))
        .reduce((a, b) => ({ ...a, ...b }), {});

    await unmock({
      ...(options.signature ? { signature: options.signature } : {}),
    });
    const { data } = await axios({
      ...(options.data ? { data: JSON.parse(options.data) } : {}),
      ...(options.headers ? { headers: makeHeaders(options.header) } : {}),
      method: options.request || "GET",
      url,
    });
    process.stdout.write(JSON.stringify(data, null, 2) + "\n");
  });

program
  .command("open <hash>")
  .option("-e, --editor [editor]", "editor (defaults to the EDITOR env variable or, in the absence of this, vi)")
  .action((hash, options) => {
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
  });

program
  .command("list")
  .action(() => {
    const logger = new WinstonLogger();
    glob("__snapshots__/**/*.snap", (e, matches) => {
      if (e) {
        throw e;
      }
      matches.forEach((match) => {
        logger.log(match.substring(0, match.length - 5).substring(14));
        const snapshots = require(`${process.cwd()}/${match}`);
        const tests = Object.keys(snapshots)
          .map(name => ({[name.split(" ").slice(0, -1).join(" ")]: new Array<string>()}))
          .reduce((a, b) => ({ ...a, ...b}), {});
        Object.keys(snapshots)
          .forEach(name => {
            tests[name.split(" ").slice(0, -1).join(" ")].push(name);
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
  });

program.parse(process.argv);
