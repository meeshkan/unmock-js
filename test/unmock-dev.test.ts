import axios from "axios";
import { kcomnu, unmockDev } from "../dist";

beforeEach(async () => {
    require("dotenv").config();
    await unmockDev({
        unmockHost: process.env.UNMOCK_HOST,
        unmockPort: process.env.UNMOCK_PORT,
    });
});
afterEach(async () => await kcomnu());

test("unmock dev has no story", async () => {
  for (let i = 0; i < 3; i++) {
    const { data: { id } }  = await axios("https://www.behance.net/v2/projects/8342343?api_key=u_n_m_o_c_k_200");
    expect(typeof id).toBe("number");
  }
});
