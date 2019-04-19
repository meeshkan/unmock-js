/**
 * @jest-environment node
 */

import express from "express";
import request from "supertest";
import { kcomnu, unmock } from "../dist";

beforeEach(async () => {
  require("dotenv").config();
  await unmock({
    save: true,
    token: process.env.UNMOCK_TOKEN,
    unmockHost: process.env.UNMOCK_HOST,
    unmockPort: process.env.UNMOCK_PORT
  });
});
afterEach(async () => await kcomnu());

test("unmock whitelists localhost", async () => {
  const app = express();
  app.get("/", (_, res, ___) => {
    res.json({ success: true });
  });
  const { body } = await request(app)
    .get("/")
    .expect(200);
  expect(body).toEqual({ success: true });
});
