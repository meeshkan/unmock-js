import * as path from "path";
import { deletePidFile, readPidIfExists, writePid } from "../pid";

const LOCAL_CONFIG_DIRECTORY = path.resolve(__dirname, ".unmock");

afterEach(() => {
  deletePidFile(LOCAL_CONFIG_DIRECTORY);
});

it("should write process PID to given file and read it", () => {
  const pid = process.pid;
  writePid(LOCAL_CONFIG_DIRECTORY);
  const writtenPid = readPidIfExists(LOCAL_CONFIG_DIRECTORY);
  expect(writtenPid).toBe(pid);
});
