import axios from "axios";
import { kcomnu, unmock } from "../dist";

beforeEach(async () => {
    require("dotenv").config();
    await unmock({
        ignore: "story",
        unmockHost: process.env.UNMOCK_HOST,
        unmockPort: process.env.UNMOCK_PORT,
    });
});
afterEach(async () => await kcomnu());

test("unmock no story", async () => {
  for (let i = 0; i < 3; i++) {
    const { data: { projects } }  = await axios("https://www.behance.net/v2/projects?api_key=u_n_m_o_c_k_200");
    expect(typeof projects[0].id).toBe("number");
  }
});
