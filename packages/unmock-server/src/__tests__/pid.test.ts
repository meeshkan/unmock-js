import * as path from "path";
import { deletePidFile, readPidIfExists, writePid } from "../pid";

const localConfigDirectory = path.resolve(__dirname, ".unmock");

afterEach(() => {
  deletePidFile();
});

it("should write process PID to given file and read it", () => {
  const pid = process.pid;
  writePid(localConfigDirectory);
  const writtenPid = readPidIfExists(localConfigDirectory);
  expect(writtenPid).toBe(pid);
});
