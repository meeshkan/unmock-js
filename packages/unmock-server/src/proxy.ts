import http = require("http");
import httpProxy = require("http-proxy");
import net = require("net");

const port = 8008;

const log = (...args: any[]) => console.log(...args); // tslint:disable-line

const TARGET_HOST = "localhost";
const TARGET_HTTP_PORT = 8000;
const TARGET_HTTPS_PORT = 8443;
const TARGET_HTTP_URL = `http://${TARGET_HOST}:${TARGET_HTTP_PORT}`;

const proxy = httpProxy.createProxyServer({});

proxy.on("error", (err, _, res) => {
  log("proxy error", err);
  res.end();
});

proxy.on(
  "proxyReq",
  (proxyReq: http.ClientRequest, req: http.IncomingMessage, __, ___) => {
    proxyReq.setHeader("X-Forwarded-host", req.headers.host || "");
  },
);

/**
 * HTTP proxy. Sets `X-Forwarded-Host` header.
 */
export const httpServerProxy = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
) => {
  log("Proxy HTTP request for:", req.url, "sending to", TARGET_HTTP_URL);

  proxy.web(req, res, { target: TARGET_HTTP_URL });
};

/**
 * HTTPS proxy
 */
export const connectListener = (
  req: http.IncomingMessage,
  socket: net.Socket,
  bodyhead: any,
) => {
  log(`Request to ${req.headers.host}, ${req.url}, ${req}`);

  const proxySocket = new net.Socket();
  proxySocket.connect(TARGET_HTTPS_PORT, TARGET_HOST, () => {
    log(
      `Connect at ${port} to host ${req.headers.host}, version ${req.httpVersion}, bodyhead: ${bodyhead}`,
    );
    proxySocket.write(bodyhead);
    socket.write(
      "HTTP/" + req.httpVersion + " 200 Connection established\r\n\r\n",
    );
  });

  proxySocket.on("data", chunk => {
    socket.write(chunk);
  });

  proxySocket.on("end", () => {
    socket.end();
  });

  proxySocket.on("error", () => {
    socket.write("HTTP/" + req.httpVersion + " 500 Connection error\r\n\r\n");
    socket.end();
  });

  socket.on("data", chunk => {
    proxySocket.write(chunk);
  });

  socket.on("end", () => {
    proxySocket.end();
  });

  socket.on("error", () => {
    proxySocket.end();
  });
};

export const startProxy = () => {
  log(`Starting HTTP proxy at ${port}`);
  const server = http
    .createServer(httpServerProxy)
    .listen(port, () => log(`HTTP proxy listening at ${port}`));
  log(`Adding HTTPS listener at ${port}`);
  server.addListener("connect", connectListener);
  return server;
};
