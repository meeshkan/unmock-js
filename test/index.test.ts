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
  require("debug")("unmock-log")("test running");
  const { data: { projects }} = await axios("https://www.behance.net/v2/projects=?api_key=u_n_m_o_c_k_200");
  expect(projects[0].id).toBeGreaterThan(0);
});
