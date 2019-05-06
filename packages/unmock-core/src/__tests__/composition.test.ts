import {
  ignoreAuth as _ignoreAuth,
  unmock as _unmock,
  UnmockOptions,
} from "..";

const silentBackend = {
  initialize: jest.fn(),
  reset: jest.fn(),
};
const silentPersistence = {
  getPath: jest.fn(),
  hasHash: jest.fn(),
  loadAuth: jest.fn(),
  loadMeta: jest.fn(),
  loadRequest: jest.fn(),
  loadResponse: jest.fn(),
  loadToken: jest.fn(),
  loadUserId: jest.fn(),
  saveAuth: jest.fn(),
  saveMeta: jest.fn(),
  saveRequest: jest.fn(),
  saveResponse: jest.fn(),
  saveToken: jest.fn(),
  saveUserId: jest.fn(),
};
const opts = new UnmockOptions({ persistence: silentPersistence });
const ignoreAuth = _ignoreAuth(opts);
const unmock = _unmock(opts, silentBackend);

describe("testing composition", () => {
  test("Unmock with baseIgnore", async () => {
    await unmock(ignoreAuth({ token: "abc" }));
  });
});
