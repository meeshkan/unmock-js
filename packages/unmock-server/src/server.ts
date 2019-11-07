import debug from "debug";
import express = require("express");
// @ts-ignore
import helmet = require("helmet");
import * as http from "http";
import * as https from "https";
import * as tls from "tls";
import { SERVER_HTTP_PORT, SERVER_HTTPS_PORT } from "./constants";
import { createSignedCertificate } from "./forge";

import {
  ISerializedRequest,
  ISerializedResponse,
  transform,
} from "unmock-core";
import { createUnmockAlgo } from "./unmock";

const httpPort = SERVER_HTTP_PORT;
const httpsPort = SERVER_HTTPS_PORT;

const log = (...args: any[]) => console.log(...args); //tslint:disable-line
const debugLog = debug("unmock-server:express");

export interface IServerOptions {
  servicesDirectory?: string;
}

export const serialize = async (
  req: express.Request,
): Promise<ISerializedRequest> => {
  const serializedRequest: ISerializedRequest = {
    method: req.method.toLowerCase() as any,
    headers: {},
    host: req.get("x-forwarded-host") || req.hostname,
    path: `${req.originalUrl}`,
    pathname: req.path, // TODO
    query: req.query,
    protocol: req.protocol as any,
  };
  return serializedRequest;
};

export const requestResponseHandler = (opts: IServerOptions) => {
  const { unmock, algo } = createUnmockAlgo(opts);

  const handler = async (req: express.Request, res: express.Response) => {
    const serializedRequest: ISerializedRequest = await serialize(req);

    const sendResponse = (serializedResponse: ISerializedResponse) => {
      res.set(serializedResponse.headers);
      res.status(serializedResponse.statusCode).send(serializedResponse.body);
    };

    const emitError = (e: Error) => {
      debugLog(`Error: ${e.message}, ${e.stack}`);
      res.status(500).send(e.message);
    };

    if (!algo.onSerializedRequest) {
      throw Error("No serialized request");
    }
    algo.onSerializedRequest(serializedRequest, sendResponse, emitError);
  };

  return { unmock, handler };
};

export const buildApp = (opts?: IServerOptions) => {
  const app = express();
  app.use(helmet());

  const { unmock, handler } = requestResponseHandler(opts || {});

  app.post(
    "/api",
    (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      // TODO Better way to check if this request was proxied or not
      if (typeof req.get("x-forwarded-host") !== "undefined") {
        return next();
      }
      try {
        if (req.query && req.query.code) {
          debugLog(`Setting response code to ${req.query.code}`);
          const asNumber = parseInt(req.query.code, 10);
          Object.values(unmock.services).forEach(service =>
            service.state(
              // @ts-ignore
              transform.withCodes(asNumber),
            ),
          );
          res.json({ code: req.query.code });
          return;
        }
        return res.sendStatus(400);
      } catch (err) {
        next(err);
      }
    },
  );

  app.all("*", handler);

  return { unmock, app };
};

export const generateContext = (servername: string) => {
  debugLog(`Generating context for ${servername}`);
  const { privateKey, signedCrt } = createSignedCertificate(servername);
  return tls.createSecureContext({
    key: privateKey,
    cert: signedCrt,
  });
};

export const startServer = (app: express.Express) => {
  const { privateKey, signedCrt } = createSignedCertificate("localhost");
  const options = {
    SNICallback: (
      servername: string,
      cb: (err: Error | null, ctx: tls.SecureContext) => void,
    ) => {
      debugLog(`SNICallback to ${servername}`);
      const context = generateContext(servername);
      debugLog(`Found certificate for ${servername}`);
      if (cb) {
        return cb(null, context);
      }
      // Compatibility with older versions of node
      return context;
    },
    // must list a default key and cert because required by tls.createServer()
    key: privateKey,
    cert: signedCrt,
  };

  const httpServer = http.createServer(app);
  const httpsServer = https.createServer(options, app);

  httpServer.listen(httpPort, () => {
    log("HTTP server starting on port: " + httpPort);
  });

  httpsServer.listen(httpsPort, () => {
    log("HTTPS server starting on port: " + httpsPort);
  });
};
