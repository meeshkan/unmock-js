import { spawn } from "child_process";
import chalk from "chalk";

/**
 * NodePkgInstaller
 *
 * inspired by create-react-app's internal package installer
 */
export default class NodePkgInstaller {
  constructor(public options: INodePkgInstallerOpts) {}

  public install(dependencies: string[]) {
    return new Promise((resolve, reject) => {
      const { root, useYarn, usePnp, verbose, isOnline, isDev } = this.options;

      let command: string;
      let args: string[];

      if (useYarn) {
        command = "yarnpkg";
        args = ["add", "--exact"];

        if (!isOnline) args.push("--offline");
        if (usePnp) args.push("--enable-pnp");
        if (isDev) args.push("-D");

        args = args.concat(dependencies);

        args.push("--cwd");
        args.push(root);

        if (!isOnline) {
          console.log(chalk.yellow("You appear to be offline."));
          console.log(
            chalk.yellow("Falling back to the local Yarn cache.") + "\n",
          );
        }
      } else {
        command = "npm";
        args = ["install", "--save", "--save-exact", "--loglevel", "error"];

        if (isDev) args.push("--save-dev");

        args = args.concat(dependencies);

        if (usePnp) {
          console.log(chalk.yellow("NPM doesn't support PnP."));
          console.log(
            chalk.yellow("Falling back to the regular installs.") + "\n",
          );
        }
      }

      if (verbose) args.push("--verbose");

      const child = spawn(command, args, { stdio: "inherit" });

      child.on("close", code => {
        if (code !== 0) {
          reject({
            command: `${command} ${args.join(" ")}`,
          });
          return;
        }
        resolve();
      });
    });
  }
}

export interface INodePkgInstallerOpts {
  root: string;
  useYarn: boolean;
  usePnp: boolean;
  verbose: boolean;
  isOnline: boolean;
  isDev: boolean;
}
