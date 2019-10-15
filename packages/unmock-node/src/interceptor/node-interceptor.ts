import debug from "debug";
import {
  ClientRequest,
  IncomingMessage,
  RequestOptions,
  ServerResponse,
} from "http";
import Mitm = require("mitm");
import * as net from "net";
import { ISerializedRequest, ISerializedResponse } from "unmock-core";
import {
  IInterceptor,
  IInterceptorOptions,
} from "unmock-core/dist/interceptor";
import { serializeRequest } from "../serialize";

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

/**
 * Node.js interceptor using node-mitm.
 * @param options Interceptor options
 */
class NodeInterceptor implements IInterceptor {
  private mitm: any;
  /**
   * Create interceptor and start intercepting requests.
   * @param config
   */
  constructor(public readonly config: IInterceptorOptions) {
    this.initialize(config.shouldBypassHost);
  }

  /**
   * Disable interceptor.
   */
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
        let serializedRequest: ISerializedRequest;
        try {
          serializedRequest = await serializeRequest(req);
        } catch (err) {
          debugLog(`Failed serializing request`);
          clientRequest.emit("error", err);
          return;
        }

        setImmediate(() =>
          this.config.onSerializedRequest(
            serializedRequest,
            (serializedResponse: ISerializedResponse) =>
              respondFromSerializedResponse(serializedResponse, res),
            (err: Error) => clientRequest.emit("error", err),
          ),
        );
      },
    );
  }
}

export default NodeInterceptor;
