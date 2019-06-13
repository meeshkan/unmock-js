export interface ISerializedRequest {
  body?: string;
  method: string;
  hostname: string;
  pathname: string;
}

export interface ISerializedResponse {
  body: any;
  statusCode: number;
}

export interface IMock {
  request: ISerializedRequest;
  response: ISerializedResponse;
}
