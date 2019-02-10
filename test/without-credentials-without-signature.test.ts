/**
 * @jest-environment node
 */

import axios from "axios";
import { kcomnu, unmock } from "../dist";

beforeEach(async () => {
  require("dotenv").config();
  await unmock({
      unmockHost: process.env.UNMOCK_HOST,
      unmockPort: process.env.UNMOCK_PORT,
  });
});

afterEach(async () => {
  await kcomnu();
});

test("without credentials without credentials returns something", async () => {
  const { data }  = await axios("https://www.example.com");
  // just get the ball over the net, as signatureless is wild west
  expect(data !== undefined).toBe(true);
});
