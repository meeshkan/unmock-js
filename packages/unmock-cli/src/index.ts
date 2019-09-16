import * as program from "commander";

export default () => {
  program.usage("unmock <command>");
  program.command("init");
  program.parse(process.argv);
};
