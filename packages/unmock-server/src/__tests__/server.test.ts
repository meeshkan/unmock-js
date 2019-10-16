import * as path from "path";
import request = require("supertest");
import { transform } from "unmock-core";
import { buildApp } from "../server";

const servicesDirectory = path.resolve(__dirname, "__unmock__");

describe("Express server", () => {
  const { app, unmock } = buildApp({ servicesDirectory });

  beforeEach(() => {
    unmock.reset();
  });

  it("builds app", async () => {
    unmock.services["petstore.swagger.io"].state(transform.withCodes(200));
    const response = await request(app)
      .get("/v2/pet/23")
      .set("X-Forwarded-For", "petstore.swagger.io")
      .expect(200);
    expect(JSON.parse(response.text)).toHaveProperty("id", expect.any(Number));
  });
});
