import debug from "debug";
import {
  ClientRequest,
  IncomingMessage,
  RequestOptions,
  ServerResponse,
} from "http";
import Mitm = require("mitm");
import * as net from "net";
import { ISerializedRequest, ISerializedResponse } from "../interfaces";
import { serializeRequest } from "../serialize";
import {
  handleRequest,
  IInterceptor,
  IInterceptorConstructor,
  IInterceptorOptions,
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

const NodeInterceptorConstructor: IInterceptorConstructor = class NodeInterceptor
  implements IInterceptor {
  private mitm: any;
  constructor(public readonly options: IInterceptorOptions) {
    this.initialize(options.shouldBypassHost);
  }

  public disable() {
    if (this.mitm) {
      this.mitm.disable();
      this.mitm = undefined;
    }
    ClientRequestTracker.stop();
  }

  private initialize(shouldBypass: (host: string) => boolean) {
    if (this.mitm !== undefined) {
      this.disable();
    }
    this.mitm = Mitm();

    // Client-side socket connect, use to bypass connections
    this.mitm.on(
      "connect",
      (socket: IBypassableSocket, opts: RequestOptions) => {
        if (shouldBypass(opts.host || "")) {
          socket.bypass();
        }
      },
    );

    ClientRequestTracker.start();

    this.mitm.on(
      "request",
      async (req: IncomingMessage, res: ServerResponse) => {
        debugLog("Handling incoming message...");
        req.on("error", (e: any) =>
          debugLog("Error on intercepted request:", e),
        );
        req.on("abort", () => debugLog("Intercepted request aborted"));
        const clientRequest: ClientRequest = ClientRequestTracker.pop(req);
        const serializedRequest: ISerializedRequest = await serializeRequest(
          req,
        );
        setImmediate(() =>
          handleRequest(
            serializedRequest,
            this.options.listener.createResponse,
            (err: Error) => clientRequest.emit("error", err),
            (serializedResponse: ISerializedResponse) => {
              respondFromSerializedResponse(serializedResponse, res);
            },
          ),
        );
      },
    );
  }
};

export default NodeInterceptorConstructor;
