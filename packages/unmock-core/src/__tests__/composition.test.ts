import {
  ignoreAuth as _ignoreAuth,
  IMetaData,
  IRequestData,
  IResponseData,
  unmock as _unmock,
  UnmockOptions,
} from "..";

const emptyFunc = () => {
  return;
};
const silentBackend = {
  initialize: emptyFunc,
  reset: emptyFunc,
};
const silentPersistence = {
  getPath: () => "",
  hasHash: (hash: string) => false,
  loadAuth: emptyFunc,
  loadMeta: (hash: string) => {
    return {};
  },
  loadRequest: (hash: string) => {
    return {};
  },
  loadResponse: (hash: string) => {
    return {};
  },
  loadToken: emptyFunc,
  loadUserId: emptyFunc,
  saveAuth: emptyFunc,
  saveMeta: (hash: string, data: IMetaData) => {
    return;
  },
  saveRequest: (hash: string, data: IRequestData) => {
    return;
  },
  saveResponse: (hash: string, data: IResponseData) => {
    return;
  },
  saveToken: (token: string) => {
    return;
  },
  saveUserId: (userId: string) => {
    return;
  },
};
const opts = new UnmockOptions({ persistence: silentPersistence });
const ignoreAuth = _ignoreAuth(opts);
const unmock = _unmock(opts, silentBackend);

describe("testing composition", () => {
  test("Unmock with baseIgnore", async () => {
    await unmock(ignoreAuth({ token: "abc" }));
  });
});
