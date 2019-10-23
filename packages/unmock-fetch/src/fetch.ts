import debug from "debug";
import {
  CreateResponse,
  ISerializedResponse,
  OnSerializedRequest,
} from "unmock-core/dist/interfaces";
import { Fetch } from ".";
import serialize from "./serialize";
import { Response } from "./types";

const debugLog = debug("unmock:fetch-mitm");

const isCreateResponse = (
  cb: CreateResponse | OnSerializedRequest,
): cb is CreateResponse => cb.length === 1; // Check the number of function arguments

export const buildFetch = (cb: CreateResponse | OnSerializedRequest): Fetch =>
  function fetch(url: RequestInfo, init?: RequestInit): Promise<Response> {
    const req = serialize(url);
    debugLog(`Serialized request: ${JSON.stringify(req)}, init: ${init}`);

    return new Promise((resolve, reject) => {
      const sendResponse = (res: ISerializedResponse): void => {
        const responseInit: ResponseInit = { status: res.statusCode }; // TODO Headers
        resolve(new Response(res.body, responseInit));
      };

      const emitError = (e: Error) => reject(e);

      setImmediate(() => {
        if (isCreateResponse(cb)) {
          try {
            const res = cb(req);
            if (typeof res === "undefined") {
              return reject("Empty response");
            }
            sendResponse(res);
          } catch (err) {
            reject(err);
          }
        } else {
          cb(req, sendResponse, emitError);
        }
      });
    });
  };

export default buildFetch;
