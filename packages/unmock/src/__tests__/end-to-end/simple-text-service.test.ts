import axios from "axios";
import unmock from "../../node";

unmock
  .mock("https://api.foo.com/v1")
  .get("/txt")
  .reply(200, "hello");

beforeAll(() => unmock.on());
afterAll(() => unmock.off());
describe("Simple service test", () => {
  it("Should return text value from a simple service", async () => {
    const response0 = await axios("https://api.foo.com/v1/txt");
    expect(response0.data).toEqual("hello");
  });
});
