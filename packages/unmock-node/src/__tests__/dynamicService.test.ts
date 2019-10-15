import axios from "axios";
import { u } from "unmock-core";
import unmock from "..";

const expectNServices = (expectedLength: number) =>
  expect(Object.keys(unmock.services).length).toEqual(expectedLength);

// @ts-ignore // we access private fields in this test for simplicity; it would probably be cleaner to have some of these as E2E tests
const getPrivateSchema = (name: string) => unmock.services[name].core.oasSchema;

describe("Tests dynamic path tests", () => {
  beforeEach(() => unmock.reloadServices());
  describe("Paths can be defined using arrays and regexs", () => {
    it("Also handles multiple parameters", async () => {
      expectNServices(0);
      unmock
        .nock("https://www.breakfast.com", "menu")
        .get(["menu", ["bacon", /\W+/], "pancakes", /\d+/, ["spam", /eggs/]])
        .reply(200);
      expectNServices(1);
      const schema = getPrivateSchema("menu");
      expect(Object.keys(schema.paths).length).toEqual(1);
      const path = Object.keys(schema.paths)[0];
      expect(path).toMatch(/\/menu\/{bacon}\/pancakes\/{\w+}\/{spam}/);
      const params = schema.paths[path].parameters;
      expect(params.length).toEqual(3);
      expect(params[0].schema.pattern).toEqual(/\W+/.source);
      expect(params[1].schema.pattern).toEqual(/\d+/.source);
      expect(params[2].schema.pattern).toEqual(/eggs/.source);
      // basic E2E test:
      unmock.on();
      const res = await axios("https://www.breakfast.com/menu/!@@!/pancakes/123/FeggsX");      
      expect(res.status).toEqual(200);
      unmock.off();
    });
  });

  describe("schema generates valid, random data", () => {
    it("faker works out of the box", async () => {
      unmock
        .nock("https://www.calendar.com")
        .get("/")
        .reply(200, u.string("date.future"));
      unmock.on();
      const res = await axios("https://www.calendar.com");
      expect(Date.parse(res.data)).toBeGreaterThan(Date.now());
      unmock.off();
    });
  });
});
