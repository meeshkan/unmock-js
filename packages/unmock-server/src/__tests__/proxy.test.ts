import * as http from "http";
// import request = require("supertest");
import { connectListener, httpServerProxy } from "../proxy";

describe("Unmock proxy", () => {
  it("should create successfully", () => {
    const server = http.createServer(httpServerProxy);
    server.addListener("connect", connectListener);
  });
});
