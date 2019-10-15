import express = require("express");
import * as fs from "fs";
import * as http from "http";
import * as https from "https";
import * as os from "os";

const httpPort = 8000;
const httpsPort = 8443;

const log = (...args: any[]) => console.log(...args); //tslint:disable-line

export const buildApp = () => {
  const app = express();

  const domain = process.env.UNMOCK_SERVER_DOMAIN || "localhost";

  app.get("/unmock-api", (req, res, next) => {
    if (req.hostname === domain) {
      res.send(
        `unmock-api: host ${req.headers.host}, url: ${
          req.url
        }, own hostname: ${os.hostname()}, req.hostname: ${req.hostname}`,
      );
    } else {
      next();
    }
  });

  app.get("*", (req, res) => {
    res.send(`You made request to ${req.headers.host} at ${req.url}`);
  });

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
