import { ISerializedRequest } from "..";
import { getResponseForRequest } from "../request-handler";

describe("get serialized response for serialized request", () => {
  test("does not blow up", () => {
    const request: ISerializedRequest = {
      host: "example.org",
      method: "GET",
      path: "/",
      protocol: "https",
    };
    const response = getResponseForRequest(request);
    expect(response.statusCode).toBe(200);
  });
});
