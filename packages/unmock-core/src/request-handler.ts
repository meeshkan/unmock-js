import { ISerializedRequest, ISerializedResponse } from "./interfaces";

export const getResponseForRequest = (
  request: ISerializedRequest,
): ISerializedResponse => {
  console.log(request); // tslint:disable-line
  const response: ISerializedResponse = { statusCode: 200 };
  return response;
};
