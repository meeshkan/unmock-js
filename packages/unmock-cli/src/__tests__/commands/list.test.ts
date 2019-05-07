import { curlInternal } from "../../commands/curl";
import { listInternal } from "../../commands/list";

test("list works", async () => {
  // this makes sure that some test has happened
  await curlInternal("https://www.behance.net/v2/projects", {});
  const log = jest.fn();
  await listInternal({ log });
  // smoke test, just to make sure it is called at all
  expect(log.mock.calls.length).toBeGreaterThan(3);
});
