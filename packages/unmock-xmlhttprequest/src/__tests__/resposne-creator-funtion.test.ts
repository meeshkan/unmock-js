/**
 * @jest-environment jsdom
 */
import {
  CreateResponse,
  ISerializedRequest,
  ISerializedResponse,
} from "unmock-core/dist/interfaces";
import { replaceOpenAndReturnOriginal } from "..";

/**
 * Example algorithm for how to calculate the response from serialized request.
 * @param req Serialized request
 * @param sendResponse Function for sending the response, handed by the interceptor.
 * @param emitError Function for emitting an error, handed by the interceptor.
 */
const okResponseCreator: CreateResponse = (
  _: ISerializedRequest,
): ISerializedResponse => {
  return {
    headers: {},
    statusCode: 200,
    body: JSON.stringify({
      ok: true,
    }),
  };
};

replaceOpenAndReturnOriginal(okResponseCreator);

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
