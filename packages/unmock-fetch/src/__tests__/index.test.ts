import {
  ISerializedRequest,
  ISerializedResponse,
  OnSerializedRequest,
} from "unmock-core/dist/interfaces";
import UnmockFetch, { buildFetch } from "../";

const testUrl = "http://example.com";

/**
 * Example algorithm for how to calculate the response from serialized request.
 * @param req Serialized request
 * @param sendResponse Function for sending the response, handed by the interceptor.
 * @param emitError Function for emitting an error, handed by the interceptor.
 */
const respondOk: OnSerializedRequest = (
  _: ISerializedRequest,
  sendResponse: (res: ISerializedResponse) => void,
  emitError: (e: Error) => void,
) => {
  try {
    const res: ISerializedResponse = {
      headers: {},
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
      }),
    };
    sendResponse(res);
  } catch (err) {
    emitError(err);
  }
};

const fetch = buildFetch(respondOk);

describe("Built fetch", () => {
  it("should respond as expected", async () => {
    const response = await fetch(testUrl);
    expect(response.ok).toBe(true);
  });
});

describe("unmock-fetch polyfill", () => {
  beforeAll(() => {
    // @ts-ignore
    UnmockFetch.on(respondOk);
  });
  it("should define global.fetch", async () => {
    // @ts-ignore
    const response = await global.fetch(testUrl);
    expect(response.ok).toBe(true);
  });
  afterAll(() => {
    UnmockFetch.off();
  });
});
