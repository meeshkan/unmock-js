import * as bodyParser from "body-parser";
import debug from "debug";
import express = require("express");
// @ts-ignore
import helmet = require("helmet");
import * as http from "http";
import { Service, UnmockPackage } from "unmock-core";
import { DEFAULT_ADMIN_PORT } from "./constants";

const httpPort = process.env.UNMOCK_ADMIN_PORT
  ? parseInt(process.env.UNMOCK_ADMIN_PORT, 10)
  : DEFAULT_ADMIN_PORT;

const debugLog = debug("unmock-server:admin");

const serviceExists = (unmock: UnmockPackage, name: string) => {
  return Object.keys(unmock.services)
    .map(service => service)
    .includes(name);
};

const postServiceHandler = (unmock: UnmockPackage) => (
  req: express.Request,
  res: express.Response,
) => {
  const name = req.params.service;
  const body = req.body;

  if (!Service.isOpenAPIObject(body)) {
    return res.status(400).send("Body not valid OpenAPI object");
  }

  const exists = serviceExists(unmock, name);

  if (!exists) {
    debugLog(`Creating new service ${name}`);
    unmock.backend.faker.add(Service.fromOpenAPI({ schema: body, name }));
  } else {
    debugLog(`Service ${name} exists, updating`);
    unmock.backend.faker.update(Service.fromOpenAPI({ schema: body, name }));
  }

  return res.sendStatus(200);
};

const getServiceHandler = (unmock: UnmockPackage) => (
  req: express.Request,
  res: express.Response,
) => {
  const name = req.params.service;

  const exists = serviceExists(unmock, name);

  if (!exists) {
    return res.status(404).send(`Service with name: ${name} does not exist.`);
  }

  debugLog(`Service ${name} exists, updating`);
  const schema = unmock.services[name].core.schema;

  return res.status(200).send(schema);
};

export const servicesRoute = ({
  unmock,
}: {
  unmock: UnmockPackage;
}): express.Router => {
  const router = express.Router();

  router.post("/:service", postServiceHandler(unmock));
  router.get("/:service", getServiceHandler(unmock));

  return router;
};

export const buildAdminApp = ({ unmock }: { unmock: UnmockPackage }) => {
  const app = express();

  app.use(helmet());
  app.use(bodyParser.json());

  app.use("/services", servicesRoute({ unmock }));

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
