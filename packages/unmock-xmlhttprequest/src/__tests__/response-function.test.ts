/**
 * @jest-environment jsdom
 */
import {
  ISerializedRequest,
  ISerializedResponse,
  OnSerializedRequest,
} from "unmock-core/dist/interfaces";
import { replaceOpenAndReturnOriginal } from "..";

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

let openCommand: (
  method: string,
  url: string,
  async?: boolean,
  username?: string | null,
  password?: string | null,
) => void;

beforeAll(() => {
  openCommand = replaceOpenAndReturnOriginal(respondOk);
});
afterAll(() => {
  XMLHttpRequest.prototype.open = openCommand;
});

describe("Monkey patched XMLHttpResponse", () => {
  it("should respond as expected when used with callback", done => {
    const request = new XMLHttpRequest();
    request.open("GET", "https://example.com");
    request.onload = () => {
      const asJson = JSON.parse(request.responseText);
      expect(asJson.ok).toBe(true);
      done();
    };
    request.send();
  });
});
