import { IncomingMessage, request as httpRequest, ServerResponse } from "http";
import { request as httpsRequest, RequestOptions } from "https";
import Mitm from "mitm";
import {
  constants,
  IBackend,
  IMetaData,
  IStories,
  UnmockOptions,
  util,
} from "unmock-core";
import { computeHashV0 } from "unmock-hash";
import { snapshot } from "../persistence/snapshot";

const { buildPath, endReporter, makeAuthHeader } = util;
const { UNMOCK_UA_HEADER_NAME, MOSES } = constants;
const metaData: IMetaData = {
  lang: "node",
};
const BufferToStringOrEmpty = (buffer: Buffer[], key: string) => {
  const retObj: { [key: string]: string } = {};
  if (buffer.length > 0) {
    retObj[key] = buffer.map((b) => b.toString()).join("");
  }
  return retObj;
};

let mitm: any;

const mHttp = (
  userId: string | null,
  story: IStories,
  token: string | undefined,
  opts: UnmockOptions,
  req: IncomingMessage,
  res: ServerResponse,
) => {
  const { host, ...rawHeaders } = req.headers;
  const reqHost = (host || "").split(":")[0];
  const { actions, signature, ignore, persistence, unmockHost, unmockPort } = opts;
  const { method, url } = req;
  const xy = token !== undefined;
  const pathForFake = buildPath(
    opts,
    rawHeaders,
    reqHost,
    method,
    url,
    story.story,
    xy,
  );

  const unmockHeaders = {
    [UNMOCK_UA_HEADER_NAME]: "node",
    ...(token ? makeAuthHeader(token).headers : {}),
  };
  const outgoingData: Buffer[] = [];

  req.on("data", (chunk) => outgoingData.push(chunk));

  req.on("end", () => {
    const hashable = {
      body: BufferToStringOrEmpty(outgoingData, "body"),
      headers: rawHeaders as { [key: string]: string },
      hostname: host || "",
      method: method || "",
      path: req.url || "",
      story: story.story,
      user_id: userId ? userId : MOSES,
      ...(signature ? { signature } : {}),
    };
    const hash = computeHashV0(hashable, ignore, actions);
    const makesNetworkCall = opts.shouldMakeNetworkCall(hash);
    const doEndReporting = (
      fromCache: boolean,
      responseHeaders: any,
      responseBody: Buffer[],
    ) =>
      endReporter(
        opts,
        hash,
        story.story,
        fromCache,
        metaData,
        {
          ...BufferToStringOrEmpty(outgoingData, "body"),
          headers: rawHeaders,
          host: reqHost,
          method: req.method,
          path: req.url,
        },
        {
          headers: responseHeaders,
          ...BufferToStringOrEmpty(responseBody, "body"),
        },
      );

    snapshot(
      {
        hash,
        host,
        method,
        path: url,
      },
      persistence.getPath(),
    );

    if (!makesNetworkCall) {
      // Restore information from cache and send via `res`
      const response = persistence.loadResponse(hash);
      if (response.headers) {
        Object.keys(response.headers).forEach((k) => {
          res.setHeader(k, response.headers[k]);
        });
      }
      if (response.body) {
        res.write(response.body);
      }
      res.end();
      doEndReporting(
        true,
        response.headers,
        !response.body ? [] : [Buffer.from(response.body)],
      );
    } else {
      // Make a real call to unmock API
      // req.connection will be either TLSSocket or Socket; the former has encrypted attribute set to True.
      const isEncrypted = (req.connection as any).encrypted;
      const requestOptions: RequestOptions = {
        headers: { ...rawHeaders, ...unmockHeaders },
        host: unmockHost,
        method,
        path: pathForFake || "",
        port: unmockPort,
      };
      const unmockRequest = (isEncrypted ? httpsRequest : httpRequest)(
        requestOptions,
        (unmockRes: IncomingMessage) => {
          // new content from unmock API
          const incomingData: Buffer[] = [];
          res.statusCode = unmockRes.statusCode || 500;
          Object.entries(unmockRes.headers).forEach(([k, v]) => {
            if (v) {
              res.setHeader(k, v);
            }
          });
          unmockRes.on("data", (chunk) => {
            incomingData.push(chunk);
            res.write(chunk);
          });
          unmockRes.on("end", () => {
            doEndReporting(false, unmockRes.headers, incomingData);
            res.end();
          });
        },
      );
      outgoingData.forEach((buffer) => {
        unmockRequest.write(buffer);
      });
      unmockRequest.end();
    }
  });
};

export default class NodeBackend implements IBackend {
  public reset() {
    mitm.disable();
  }
  public initialize(
    userId: string,
    story: { story: string[] },
    token: string | undefined,
    options: UnmockOptions,
  ) {
    mitm = Mitm();
    mitm.on("connect", (socket: any, opts: any) => {
      if (options.isWhitelisted(opts.host)) {
        socket.bypass();
      }
    });
    mitm.on("request", (req: IncomingMessage, res: ServerResponse) => {
      mHttp(userId, story, token, options, req, res);
    });
  }
}
