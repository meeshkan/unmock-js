import axios from "axios";
import program from "commander";
import { unmock } from ".";

const collect = (val: string, memo: string[]) => {
  memo.push(val);
  return memo;
};

program
  .version("0.0.28")
  .option("-d, --data [data]", "HTTP POST data")
  .option("-H, --header [header]", "Pass custom header(s) to server", collect, [])
  .option("-X", "--request [command]", "Specify request command to use")
  .option("-S", "--signature [signature]", "Specify a signature for a request in tokenless mode")
  .parse(process.argv);

const last = process.argv[process.argv.length - 1];

const makeHeaders = (headers: string[]) =>
  headers
    .map((h) => ({[h.substring(0, h.indexOf(":")).trim()] : h.substring(h.indexOf(":") + 1).trim()}))
    .reduce((a, b) => ({...a, ...b}), {});

const run = async () => {
  await unmock({
    ...(program.signature ? { signature: program.signature } : {}),
  });
  const { data } = await axios({
    ...(program.data ? { data: JSON.parse(program.data) } : {}),
    ...(program.headers ? { headers: makeHeaders(program.header) } : {}),
    method: program.request || "GET",
    url: last,
  });
  process.stdout.write(JSON.stringify(data, null, 2) + "\n");
};

run();
