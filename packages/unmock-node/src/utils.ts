import appRootPath from "app-root-path";
import debug from "debug";
import fs from "fs";
import path from "path";

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
    appRootPath.resolve("node_modules/@unmock"),
    resolveUnmockRootDirectory(),
  ];

  const triedDirectories = process.env.UNMOCK_SERVICES_DIRECTORY
    ? defaultUnmockDirectories.concat(
        path.resolve(process.env.UNMOCK_SERVICES_DIRECTORY),
      )
    : defaultUnmockDirectories;

  debugLog(`Checking for directories: ${triedDirectories}`);

  return triedDirectories.filter(
    (directory: string) =>
      fs.existsSync(directory) && fs.statSync(directory).isDirectory(),
  );
};
