import express = require("express");
// @ts-ignore
import helmet = require("helmet");
import * as http from "http";
import { DEFAULT_ADMIN_PORT } from "./constants";

const httpPort = process.env.UNMOCK_ADMIN_PORT
  ? parseInt(process.env.UNMOCK_ADMIN_PORT, 10)
  : DEFAULT_ADMIN_PORT;

export const servicesRoute = (): express.Router => {
  const router = express.Router();
  return router;
};

export const buildAdminApp = () => {
  const app = express();

  app.use(helmet());
  app.use("/services", servicesRoute());

  return app;
};

export const startAdminServer = ({
  app,
  port,
}: {
  app: express.Express;
  port?: number;
}) => {
  const portToListen = port || httpPort;
  const httpServer = http.createServer(app);

  httpServer.listen(portToListen, () => {
    console.log(`Admin server starting on port ${portToListen}`); // tslint:disable-line
  });

  return httpServer;
};
