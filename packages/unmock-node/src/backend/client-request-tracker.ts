import debug from "debug";
import { ClientRequest, IncomingMessage } from "http";
import _ from "lodash";
import net from "net";
import { v4 as uuidv4 } from "uuid";

const debugLog = debug("unmock:client-request-tracker");

const UNMOCK_INTERNAL_HTTP_HEADER = "x-unmock-req-id";

/**
 * "Static" class for tracking client requests.
 */
export default abstract class ClientRequestTracker {
  public static readonly outgoingRequests: {
    [requestId: string]: {
      clientRequest: ClientRequest;
    };
  } = {};
  /**
   * Start tracking client requests by modifying `ClientRequest.prototype.onSocket` to add
   * a unique identifier to every request header and store the request
   * to an internal dictionary.
   */
  public static start() {
    if (ClientRequestTracker.active) {
      // Initialized already
      return;
    }

    ClientRequestTracker.origOnSocket = ClientRequest.prototype.onSocket;

    /**
     * When a socket is assigned to a client request, create an internal ID
     * and add the ID in the request header. Thereby we can map
     * the server-side incoming request to the corresponding
     * client request and emit errors properly.
     * Borrowed from https://github.com/FormidableLabs/yesno.
     */
    debugLog("Modifying client request to add request ID");
    ClientRequest.prototype.onSocket = _.flowRight(
      ClientRequestTracker.origOnSocket,
      function(this: ClientRequest, socket: net.Socket): net.Socket {
        const requestId = uuidv4();
        debugLog(
          `New socket assigned to client request, assigned ID: ${requestId}`,
        );
        ClientRequestTracker.outgoingRequests[requestId] = {
          clientRequest: this,
        };
        this.setHeader(UNMOCK_INTERNAL_HTTP_HEADER, requestId);
        return socket;
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

    if (!ClientRequestTracker.origOnSocket) {
      throw Error("No original onSocket");
    }

    ClientRequest.prototype.onSocket = ClientRequestTracker.origOnSocket;

    ClientRequestTracker.origOnSocket = undefined;
  }

  /**
   * Extract the `ClientRequest` corresponding to the given `IncomingMessage`.
   * Deletes the corresponding instance from the map of tracked requests.
   * @param incomingMessage Incoming message ("server" side)
   */
  public static extractTrackedClientRequest(
    incomingMessage: IncomingMessage,
  ): ClientRequest {
    const { [UNMOCK_INTERNAL_HTTP_HEADER]: reqId } = incomingMessage.headers;
    debugLog(
      `Intercepted incoming request with ID ${reqId}, matching to existing IDs:`,
      Object.keys(ClientRequestTracker.outgoingRequests),
    );
    if (typeof reqId !== "string") {
      throw Error("Expected to get a non empty request ID");
    }
    const outgoingRequest = ClientRequestTracker.outgoingRequests[reqId];
    if (outgoingRequest === undefined) {
      throw Error(`Expected to find a client request for request ID ${reqId}`);
    }

    delete ClientRequestTracker.outgoingRequests[reqId];

    return outgoingRequest.clientRequest;
  }

  private static origOnSocket?: (socket: net.Socket) => void;

  private static get active() {
    return ClientRequestTracker.origOnSocket !== undefined;
  }
}
