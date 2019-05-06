import { UnmockOptions } from "../";
import getToken from "../token";

beforeAll(() => {
  require("dotenv").config();
});

const makeUnmockOptions = (token: string, auth?: string) => {
  const options = new UnmockOptions({
    unmockHost: process.env.UNMOCK_HOST,
    unmockPort: process.env.UNMOCK_PORT,
  });
  const loadAuth = jest.fn();
  loadAuth.mockReturnValue(auth);
  options.persistence.loadAuth = loadAuth;
  const loadToken = jest.fn();
  loadToken.mockReturnValue(token);
  options.persistence.loadToken = loadToken;
  options.persistence.saveAuth = jest.fn();
  options.persistence.saveToken = jest.fn();
  return options;
};

test("bad auth throws an error", () => {
  const bad = async () => {
    const options = makeUnmockOptions("foo");
    await getToken(options);
  };
  return expect(bad()).rejects.toThrow();
});

test("good auth returns a token", async () => {
  const options = makeUnmockOptions(process.env.UNMOCK_TOKEN || "will fail");
  const token = await getToken(options);
  expect(token ? token.length : 0).toBeGreaterThan(20);
});
