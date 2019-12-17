import { u } from "..";
import UnmockFaker from "../faker";
import { ServiceStore } from "../service/serviceStore";

const serviceStore = new ServiceStore([]);
const faker = new UnmockFaker({ serviceStore });

const expectNServices = (expectedLength: number) =>
  expect(Object.keys(faker.services).length).toEqual(expectedLength);

describe("UnmockFaker", () => {
  beforeEach(() => serviceStore.removeAll());

  describe("adding service with nock syntax", () => {
    it("adds a service", () => {
      faker
        .nock("https://foo.com")
        .get("/foo")
        .reply(200, { foo: u.string() });
      expectNServices(1);
    });
    it("adds a service and allows faking it", () => {
      faker
        .nock("https://foo.com")
        .get("/foo")
        .reply(200, { foo: u.string() });
      const res = faker.generate({
        host: "foo.com",
        protocol: "https",
        method: "get",
        path: "/foo",
        pathname: "/foo",
        headers: {},
        query: {},
      });
      expect(res).toHaveProperty("body");
      expect(res.body).toBeDefined();
    });
  });
});
