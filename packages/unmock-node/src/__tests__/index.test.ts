/**
 * @jest-environment node
 */

import axios from "axios";
import { kcomnu, unmock } from "../";

beforeEach(async () => {
  require("dotenv").config();
  await unmock({
    save: true,
    token: process.env.UNMOCK_TOKEN,
    unmockHost: process.env.UNMOCK_HOST,
    unmockPort: process.env.UNMOCK_PORT,
  });
});
afterEach(async () => await kcomnu());

test("unmock end to end node", async () => {
  const {
    data: { projects },
  } = await axios(
    "https://www.behance.net/v2/projects?api_key=u_n_m_o_c_k_200",
  );
  expect(typeof projects[0].id).toBe("number");
  const { data } = await axios(
    `https://www.behance.net/v2/projects/${
      projects[0].id
    }?api_key=u_n_m_o_c_k_200`,
  );
  expect(data.id).toBe(projects[0].id);
  const {
    data: { comments },
  } = await axios(
    `https://www.behance.net/v2/projects/${
      projects[0].id
    }/comments?api_key=u_n_m_o_c_k_200`,
  );
  expect(typeof comments.length).toBe("number");
  const {
    data: { vid },
  } =
    // tslint:disable-next-line:max-line-length
    await axios.post(
      `https://api.hubapi.com/contacts/v1/contact/createOrUpdate/email/testingapis@hubspot.com/?hapikey=demo`,
      {
        properties: [
          {
            property: "firstname",
            value: "HubSpot",
          },
          {
            property: "lastname",
            value: "Test",
          },
        ],
      },
    );
  expect(typeof vid).toBe("number");
});
