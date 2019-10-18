import * as path from "path";
import { mkdirSync, rmdirSync, writeFileSync, accessSync, constants } from "fs";
import { execSync } from "child_process";
import { question as prompt } from "readline-sync";
import chalk from "chalk";

import WinstonLogger from "../utils/logger";
import NodePkgInstaller, {
  INodePkgInstallerOpts,
} from "../utils/NodePkgInstaller";
import initStarterTmp from "./init.starter.tmp";

const CWD = process.cwd();
const logger = new WinstonLogger();

export const init = (dirname: string = "__tests__", options: any) => {
  const pkgJson: any = require(path.join(CWD, "package.json"));
  const projectName: string = (pkgJson && pkgJson.name) || "";
  const testSuiteDir: string = path.join(CWD, dirname);
  const unmockDir: string = path.normalize(
    `${testSuiteDir}${path.sep}__unmock__`,
  );

  logger.log(
    `Creating test suite${(projectName &&
      " for " + chalk.magenta.bold(projectName)) ||
      ""}...`,
  );

  // Try to create directories
  try {
    mkdirSync(testSuiteDir);
    mkdirSync(unmockDir);
  } catch (error) {
    const deletePreviousTestsAnwser = prompt(
      `${chalk.yellow.bold(
        "unmock",
      )}: Do you wish to override existing tests?\n        (${chalk.yellow(
        "Warning: this will result in the loss of previous tests",
      )})\n        [Y/n]`,
    );
    const deletePreviousTests = deletePreviousTestsAnwser == "Y" ? true : false;

    if (deletePreviousTests) {
      // delete and continue
      rmdirSync(testSuiteDir);
    } else {
      // exit with error
      logger.error(error);
      process.exit(0);
    }
  }

  // Start dependency installation process
  logger.log("Installing dependencies...");

  const dependencies = ["unmock", "jest", "unmock-jest"];
  const useYarn = yarnExists() && options.installer != "npm" ? true : false;
  const installer = new NodePkgInstaller(<INodePkgInstallerOpts>{
    root: CWD,
    useYarn,
    usePnp: false,
    verbose: options.verbose,
    isOnline: !options.offline,
    isDev: true,
  });

  installer
    .install(dependencies)
    .then(() => {
      // After install
      // create starter template
      logger.log("Creating starter template...");
      writeFileSync(path.join(CWD, dirname, "1.test.js"), initStarterTmp);

      // setup the jest reporter
      logger.log("Configuring the jest reporter...");
      setupJestReport(projectName, unmockDir);

      logger.log("Setup complete!");

      // guides...
      console.info(
        `\n    Start writing tests in ${chalk.grey(`./${dirname}/`) +
          chalk.grey.bold("1.test.js")}\n    Enjoy testing APIs with unmock!\n`,
      );
    })
    .catch(() => {
      logger.error("Unable to install dependencies.");
      process.exit(0); // be sure to exit
    });
};

function setupJestReport(
  projectName: string = "unmock",
  outputDirectory: string = "/",
) {
  const jestConfigPath = path.join(CWD, "jest.config.js");

  // @TODO handle 'else' case
  if (!fileExistsSync(jestConfigPath)) {
    writeFileSync(jestConfigPath, jestConfigTmp(projectName, outputDirectory));
  }
}

function jestConfigTmp(projectName: string, outputDirectory: string) {
  return `\
// jest.config.js
{
  reporters: [
    "default",
    [
      "unmock-jest",
      {
        outputDirectory: "${outputDirectory}",
        outputFilename: "${projectName}-report.html"
      }
    ]
  ];
}\n`;
}

function fileExistsSync(path: string) {
  let result = true;

  try {
    accessSync(path, constants.F_OK);
  } catch (e) {
    result = false;
  }

  return result;
}

function yarnExists(): boolean {
  try {
    execSync("yarnpkg --version", { stdio: "ignore" });
    return true;
  } catch (e) {
    return false;
  }
}
