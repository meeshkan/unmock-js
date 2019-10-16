import debug from "debug";
import express = require("express");
import * as fs from "fs";
import * as http from "http";
import * as https from "https";
import * as os from "os";
import { ISerializedRequest, ISerializedResponse } from "unmock-core";
import { createUnmockAlgo } from "./unmock";

const httpPort = 8000;
const httpsPort = 8443;

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
    host: req.get("x-forwarded-for") || req.hostname,
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

  const domain = process.env.UNMOCK_SERVER_DOMAIN || "localhost";

  app.get(
    "/unmock-api",
    (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      if (req.hostname === domain) {
        res.send(
          `unmock-api: host ${req.headers.host}, url: ${
            req.url
          }, own hostname: ${os.hostname()}, req.hostname: ${req.hostname}`,
        );
      } else {
        next();
      }
    },
  );

  const { unmock, handler } = requestResponseHandler(opts || {});

  app.all("*", handler);

  return { unmock, app };
};

export const startServer = (app: express.Express) => {
  const options = {
    key: fs.readFileSync("key.pem"),
    cert: fs.readFileSync("cert.pem"),
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
