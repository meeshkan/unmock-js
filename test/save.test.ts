import axios from "axios";
import { kcomnu, unmock } from "../dist";

beforeEach(async () => {
    require("dotenv").config();
    await unmock({
        save: true,
        unmockHost: process.env.UNMOCK_HOST,
        unmockPort: process.env.UNMOCK_PORT,
    });
});
afterEach(async () => await kcomnu());

// TODO, make smarter
test("save works", async () => {
  await axios("https://www.behance.net/v2/projects?api_key=u_n_m_o_c_k_200");
});
