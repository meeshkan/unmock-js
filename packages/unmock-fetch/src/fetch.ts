import debug from "debug";
import {
  ISerializedResponse,
  OnSerializedRequest,
} from "unmock-core/dist/interfaces";
import { Fetch } from ".";
import serialize from "./serialize";
import { Response } from "./types";

const debugLog = debug("unmock:fetch-mitm");

export const buildFetch = (onSerializedRequest: OnSerializedRequest): Fetch =>
  function fetch(url: RequestInfo, init?: RequestInit): Promise<Response> {
    const req = serialize(url);
    debugLog(`Serialized request: ${JSON.stringify(req)}, init: ${init}`);

    return new Promise((resolve, reject) => {
      const sendResponse = (res: ISerializedResponse): void => {
        const responseInit: ResponseInit = { status: res.statusCode };
        resolve(new Response(res.body, responseInit));
      };

      const emitError = (e: Error) => reject(e);

      setImmediate(() => {
        onSerializedRequest(req, sendResponse, emitError);
      });
    });
  };

export default buildFetch;
