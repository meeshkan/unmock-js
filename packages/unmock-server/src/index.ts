// Build and start proxy
// Build and start Express server
import { startProxy } from "./proxy";
import { buildApp, startServer } from "./server";

const main = () => {
  const app = buildApp();
  startServer(app);
  startProxy();
};

main();
