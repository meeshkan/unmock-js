import debug from "debug";
import {
  ClientRequest,
  IncomingMessage,
  RequestOptions,
  ServerResponse,
} from "http";
import Mitm = require("mitm");
import * as net from "net";
import { CustomConsole } from "../console";
import { ISerializedRequest, ISerializedResponse } from "../interfaces";
import { serializeRequest } from "../serialize";
import {
  errorForMissingTemplate,
  IInterceptor,
  IInterceptorListener,
} from "./";
import ClientRequestTracker from "./client-request-tracker";

const debugLog = debug("unmock:node-interceptor");

const respondFromSerializedResponse = (
  serializedResponse: ISerializedResponse,
  res: ServerResponse,
) => {
  res.writeHead(serializedResponse.statusCode, serializedResponse.headers);
  res.end(serializedResponse.body);
};

interface IBypassableSocket extends net.Socket {
  bypass: () => void;
}

interface IInterceptorOptions {
  listener: IInterceptorListener;
  bypass: (host: string) => boolean;
}

const handleRequest = async (
  serializedRequest: ISerializedRequest,
  createResponse: (
    req: ISerializedRequest,
  ) => Promise<ISerializedResponse | undefined>,
  emitError: (e: Error) => void,
  sendResponse: (res: ISerializedResponse) => void,
) => {
  try {
    // Node.js serialization
    debugLog("Serialized request", JSON.stringify(serializedRequest));
    const serializedResponse:
      | ISerializedResponse
      | undefined = await createResponse(serializedRequest);

    if (serializedResponse === undefined) {
      debugLog("No match found, emitting error");
      const errMsg = errorForMissingTemplate(serializedRequest);
      const formatted = CustomConsole.format("instruct", errMsg);
      emitError(Error(formatted));
      return;
    }
    debugLog("Responding with response", JSON.stringify(serializedResponse));
    sendResponse(serializedResponse);
  } catch (err) {
    emitError(Error(`unmock error: ${err.message}`));
  }
};

export default class NodeInterceptor implements IInterceptor {
  private mitm: any;
  constructor(private readonly options: IInterceptorOptions) {}

  public initialize() {
    if (this.mitm !== undefined) {
      this.disable();
    }
    this.mitm = Mitm();

    // Client-side socket connect, use to bypass connections
    this.mitm.on(
      "connect",
      (socket: IBypassableSocket, opts: RequestOptions) => {
        // Somehow "serialize" here
        if (this.options.bypass(opts.host || "")) {
          socket.bypass();
        }
      },
    );

    ClientRequestTracker.start();

    this.mitm.on(
      "request",
      async (req: IncomingMessage, res: ServerResponse) => {
        const clientRequest: ClientRequest = ClientRequestTracker.pop(req);
        const serializedRequest: ISerializedRequest = await serializeRequest(
          req,
        );
        await handleRequest(
          serializedRequest,
          this.options.listener.createResponse,
          (err: Error) => clientRequest.emit("error", err),
          (serializedResponse: ISerializedResponse) => {
            respondFromSerializedResponse(serializedResponse, res);
          },
        );
      },
    );
  }

  public disable() {
    if (this.mitm) {
      this.mitm.disable();
      this.mitm = undefined;
    }
  }
}
