import { IncomingMessage, request as httpRequest, ServerResponse } from "http";
import { request as httpsRequest, RequestOptions } from "https";
import { rawHeadersToHeaders } from "./util";

export default (
  req: IncomingMessage,
  res: ServerResponse,
  interceptor: ({
    body,
    headers,
    host,
    method,
    path,
    port,
    req,
    res,
   }: {
    body: Buffer[],
    headers: any,
    host: string,
    method: string,
    path: string,
    port: number,
    req: IncomingMessage,
    res: ServerResponse,
  }) => {
    body: Buffer[],
    hash: string,
    headers: any,
    host: string,
    intercepted: boolean,
    method: string,
    path: string,
    port: number,
  },
  callback: (hash: string, requestBody: Buffer[], responseHeaders: any, responseBody: Buffer[]) => void) => {
  const { Host, ...rawHeaders } = rawHeadersToHeaders(req.rawHeaders);
  const [h, p] = Host.split(":");
  const outgoingData: Buffer[] = [];
  req.on("data", (chunk) => {
    outgoingData.push(chunk);
  });
  req.on("end", () => {
    const {body, hash, headers, host, intercepted, method, path, port} = interceptor({
      body: outgoingData,
      headers: rawHeaders,
      host: h,
      method: req.method || "GET",
      path: req.url || "",
      port: p ? parseInt(p, 10) : 443, // TODO: un-hardcode https
      req,
      res,
    });
    if (intercepted) {
      return;
    }
    // TODO: un-hardcode https
    // TODO: passes hackish property to options to get bypassing to work. fix?
    const request = (p === "443" || !p ? httpsRequest : httpRequest)({
      headers: { ...rawHeaders, ...headers},
      host,
      method,
      path,
      port,
      shouldBypass: true,
    } as RequestOptions, (newRes: IncomingMessage) => {
        const incomingData: Buffer[] = [];
        res.statusCode = newRes.statusCode || 500;
        Object.entries(newRes.headers).forEach(([k, v]) => {
          if (v) {
            res.setHeader(k, v);
          }
        });
        newRes.on("data", (chunk) => {
          incomingData.push(chunk);
          res.write(chunk);
        });
        newRes.on("end", () => {
          callback(
            hash,
            outgoingData,
            newRes.headers,
            incomingData);
          res.end();
        });
    });
    body.forEach((buffer) => {
      request.write(buffer);
    });
    request.end();
  });
};
