import * as appRootPath from "app-root-path";
import debug from "debug";
import * as fs from "fs";
import { uniq } from "lodash";
import * as path from "path";

const debugLog = debug("unmock:node:utils");

export const resolveUnmockRootDirectory = (): string =>
  appRootPath.resolve("__unmock__");

/**
 * Resolve the absolute paths to unmock directories.
 * Only checks that the directories exist.
 * The returned list may be empty.
 */
export const resolveUnmockDirectories = (): string[] => {
  const defaultUnmockDirectories = [
    resolveUnmockRootDirectory(),
    appRootPath.resolve("node_modules/@unmock"),
    // Also search process cwd, helpful with `npm link` for example
    // where app-root-path fails due to a symlink
    // without using APP_ROOT_PATH=`pwd`
    path.resolve(`${process.cwd()}/__unmock__`),
    path.resolve(`${process.cwd()}/node_modules/@unmock`),
  ];

  const triedDirectories = process.env.UNMOCK_SERVICES_DIRECTORY
    ? defaultUnmockDirectories.concat(
        path.resolve(process.env.UNMOCK_SERVICES_DIRECTORY),
      )
    : defaultUnmockDirectories;

  const uniqueTriedDirectories = uniq(triedDirectories);

  debugLog(`Checking for directories: ${triedDirectories}`);

  return uniqueTriedDirectories.filter(
    (directory: string) =>
      fs.existsSync(directory) && fs.statSync(directory).isDirectory(),
  );
};
