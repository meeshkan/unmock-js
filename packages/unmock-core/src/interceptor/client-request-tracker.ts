import debug from "debug";
import { ClientRequest, IncomingMessage } from "http";
import * as net from "net";
import shimmer = require("shimmer");
import { v4 as uuidv4 } from "uuid";

const debugLog = debug("unmock:client-request-tracker");

export const UNMOCK_INTERNAL_HTTP_HEADER = "x-unmock-req-id";

/**
 * "Static" class for tracking client requests.
 */
export default abstract class ClientRequestTracker {
  /**
   * Start tracking client requests by modifying `ClientRequest.prototype.onSocket` to add
   * a unique identifier to every request header and store the request
   * to an internal dictionary.
   */
  public static start() {
    shimmer.wrap(
      ClientRequest.prototype,
      "onSocket",
      (original: (socket: net.Socket) => void) =>
        function(this: ClientRequest, socket: net.Socket) {
          const requestId = uuidv4();
          debugLog(
            `New socket assigned to client request, assigned ID: ${requestId}`,
          );
          ClientRequestTracker.clientRequests[requestId] = this;
          this.setHeader(UNMOCK_INTERNAL_HTTP_HEADER, requestId);
          return original.apply(this, [socket]);
        },
    );
  }

  /**
   * Stop tracking client requests, restore `ClientRequest.prototype.onSocket`.
   */
  public static stop() {
    if (!ClientRequestTracker.active) {
      return;
    }

    shimmer.unwrap(ClientRequest.prototype, "onSocket");
  }

  /**
   * Extract the `ClientRequest` corresponding to the given `IncomingMessage`.
   * Deletes the corresponding instance from the map of tracked requests.
   * NOTE: Modifies input message by deleting the internally used header!
   * @param incomingMessage Incoming message ("server" side). The header used internal tracking is deleted!
   */
  public static pop(incomingMessage: IncomingMessage): ClientRequest {
    const { [UNMOCK_INTERNAL_HTTP_HEADER]: reqId } = incomingMessage.headers;
    debugLog(
      `Intercepted incoming request with ID ${reqId}, matching to existing IDs:`,
      Object.keys(ClientRequestTracker.clientRequests),
    );
    if (typeof reqId !== "string") {
      throw Error(
        `Expected to find a string request ID in request header, got type: ${typeof reqId}`,
      );
    }
    delete incomingMessage.headers[UNMOCK_INTERNAL_HTTP_HEADER];

    const clientRequest = ClientRequestTracker.clientRequests[reqId];
    if (clientRequest === undefined) {
      throw Error(`Expected to find a client request for request ID ${reqId}`);
    }

    delete ClientRequestTracker.clientRequests[reqId];
    return clientRequest;
  }

  private static readonly clientRequests: {
    [requestId: string]: ClientRequest;
  } = {};

  private static get active(): boolean {
    return ClientRequest.prototype.onSocket.__wrapped !== undefined;
  }
}
