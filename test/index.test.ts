import axios from "axios";
import { kcomnu, unmock } from "../src";

beforeAll(async () => {
    require("dotenv").config();
    require("debug")("unmock-log")("before all running");
    await unmock({
        unmockHost: process.env.UNMOCK_HOST,
        unmockPort: process.env.UNMOCK_PORT,
    });
});
afterAll(async () => await kcomnu());

test("unmock end to end", async () => {
  const result = await axios("https://www.behance.net/v2/projects?api_key=u_n_m_o_c_k_200");
  expect(result.data.projects[0].id).toBeGreaterThan(0);
});
