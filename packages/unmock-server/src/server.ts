import express = require("express");
import * as fs from "fs";
import * as http from "http";
import * as https from "https";
import * as os from "os";
import { ISerializedRequest, ISerializedResponse } from "unmock-core";
import { create } from "./unmock";

const httpPort = 8000;
const httpsPort = 8443;

const log = (...args: any[]) => console.log(...args); //tslint:disable-line

export const serialize = async (
  req: express.Request,
): Promise<ISerializedRequest> => {
  const serializedRequest: ISerializedRequest = {
    method: req.method.toLowerCase() as any,
    headers: {},
    host: req.hostname,
    path: req.path,
    pathname: req.path, // TODO
    query: req.query,
    protocol: req.protocol as any,
  };
  return serializedRequest;
};

// At startup:
// Load services
// Create request handler

export const requestResponseHandler = () => {
  const config = create();

  return async (req: express.Request, res: express.Response) => {
    // Serialize request
    // Call config.onSerializeRequest

    const serializedRequest: ISerializedRequest = await serialize(req);

    const sendResponse = (serializedResponse: ISerializedResponse) => {
      // TODO Headers etc.
      res.set(serializedResponse.headers);
      res.status(serializedResponse.statusCode).send(serializedResponse.body);
    };

    const emitError = (e: Error) => res.status(500).send(e.message); // TODO

    if (!config.onSerializedRequest) {
      throw Error("No serialized request");
    }
    config.onSerializedRequest(serializedRequest, sendResponse, emitError);
  };
};

export const buildApp = () => {
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

  app.all("*", requestResponseHandler());

  return app;
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
