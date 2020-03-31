import axios from "axios";
import { u } from "unmock-core";
import unmock from "..";

const nServices = () => Object.keys(unmock.services).length;

// @ts-ignore // we access private fields in this test for simplicity; it would probably be cleaner to have some of these as E2E tests
const getPrivateSchema = (name: string) => unmock.services[name].core.oasSchema;

describe("Tests dynamic path tests", () => {
  beforeEach(() => unmock.reloadServices());
  describe("Paths can be defined using arrays and regexs", () => {
    it("Also handles multiple parameters", async () => {
      expect(nServices()).toEqual(0);
      unmock
        .mock("https://www.foo.com", "foo")
        .get(["foo", ["baz", /\W+/], "bar", /\d+/, ["spam", /eggs/]])
        .reply(200);
      expect(nServices()).toEqual(1);
      const schema = getPrivateSchema("foo");
      expect(Object.keys(schema.paths).length).toEqual(1);
      const path = Object.keys(schema.paths)[0];
      expect(path).toMatch(/\/foo\/{baz}\/bar\/{\w+}\/{spam}/);
      const params = schema.paths[path].parameters;
      expect(params.length).toEqual(3);
      expect(params[0].schema.pattern).toEqual(/\W+/.source);
      expect(params[1].schema.pattern).toEqual(/\d+/.source);
      expect(params[2].schema.pattern).toEqual(/eggs/.source);
      // basic E2E test:
      unmock.on();
      const res = await axios("https://www.foo.com/foo/!@@!/bar/123/FeggsX");
      expect(res.status).toEqual(200);
      unmock.off();
    });
  });

  describe("schema generates valid stuff", () => {
    it("faker works out of the box", async () => {
      unmock
        .mock("https://www.foo.com")
        .get("/")
        .reply(200, u.string("date.future"));
      unmock.on();
      const res = await axios("https://www.foo.com");
      expect(Date.parse(res.data)).toBeGreaterThan(Date.now());
      unmock.off();
    });
  });
});
