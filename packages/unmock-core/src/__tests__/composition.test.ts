import {
  ignoreAuth as _ignoreAuth,
  unmock as _unmock,
  UnmockOptions,
} from "..";

import { FailingPersistence } from "../persistence";
jest.mock("../persistence");

const silentBackend = {
  initialize: jest.fn(),
  reset: jest.fn(),
};
const opts = new UnmockOptions({ persistence: new FailingPersistence() });
const ignoreAuth = _ignoreAuth(opts);
const unmock = _unmock(opts, silentBackend);

describe("testing composition", () => {
  test("Unmock with baseIgnore", async () => {
    await unmock(ignoreAuth({ token: "abc" }));
  });
});
