/**
 * @jest-environment jsdom
 */

import axios from "axios";
import fs from "fs";
import { ignoreStory, kcomnu, unmock } from "../";

beforeEach(async () => {
  require("dotenv").config();
  await unmock(ignoreStory({
    save: true,
    token: process.env.UNMOCK_TOKEN,
    unmockHost: process.env.UNMOCK_HOST,
    unmockPort: process.env.UNMOCK_PORT,
  }));
});

afterEach(async () => {
  await kcomnu();
});

test("back to back requests yield from cache", async () => {
  const {
    data: { projects },
  } = await axios(
    "https://www.behance.net/v2/projects?api_key=u_n_m_o_c_k_200",
  );
  expect(typeof projects[0].id).toBe("number");
  // test to make sure cache works
  const {
    data,
  } = await axios(
    "https://www.behance.net/v2/projects?api_key=u_n_m_o_c_k_200",
  );
  expect(typeof data.projects[0].id).toBe("number");
});
