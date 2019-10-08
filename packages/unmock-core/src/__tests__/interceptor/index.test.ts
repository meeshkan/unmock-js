import axios from "axios";
import { removeCodes } from "openapi-refinements";
import * as path from "path";
import { Service, sinon, transform, UnmockPackage } from "../../";
import NodeBackend from "../../backend";
import { IInterceptor, IInterceptorOptions } from "../../interceptor";
import NodeInterceptor from "../../interceptor/node-interceptor";
import { ISerializedRequest } from "../../interfaces";
import { testResponse } from "../utils";

describe("Node.js interceptor", () => {
  let nodeInterceptor: IInterceptor;
  const createResponse = jest.fn();

  beforeAll(() => {
    const options: IInterceptorOptions = {
      listener: { createResponse },
      shouldBypassHost: (host: string) => false,
    };
    nodeInterceptor = new NodeInterceptor(options);
  });

  afterEach(() => {
    createResponse.mockReset();
  });

  it("should call createResponse with correctly serialized request", async () => {
    createResponse.mockImplementationOnce(
      (_: ISerializedRequest) => testResponse,
    );
    await axios("http://petstore.swagger.io/v1/pets");
    expect(createResponse).toHaveBeenCalledTimes(1);
    expect(createResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "petstore.swagger.io",
        method: "get",
        path: "/v1/pets",
        protocol: "http",
      }),
    );
  });

  it("should return expected response", async () => {
    createResponse.mockImplementationOnce(
      (_: ISerializedRequest) => testResponse,
    );
    const { data: responseBody } = await axios(
      "http://petstore.swagger.io/v1/pets",
    );
    expect(responseBody).toEqual(testResponse.body);
  });

  it("should throw for a request when response status code is an error", async () => {
    createResponse.mockImplementationOnce((_: ISerializedRequest) => ({
      ...testResponse,
      statusCode: 500,
    }));
    await expect(axios("http://petstore.swagger.io/v1/pets")).rejects.toThrow(
      "Request failed with status code 500",
    );
  });

  afterAll(() => {
    nodeInterceptor.disable();
  });
});
