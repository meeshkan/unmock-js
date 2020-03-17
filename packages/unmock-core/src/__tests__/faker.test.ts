import { Service, transform, u } from "..";
import UnmockFaker from "../faker";
import { ServiceStore } from "../service/serviceStore";
import { PetStoreSchema } from "./utils";

const serviceStore = new ServiceStore([]);
const faker = new UnmockFaker({ serviceStore });

const countServices = (uFaker: UnmockFaker) =>
  Object.keys(uFaker.services).length;

const expectNServices = (expectedLength: number) =>
  expect(Object.keys(faker.services).length).toEqual(expectedLength);

describe("UnmockFaker", () => {
  beforeEach(() => faker.purge());

  describe("purge()", () => {
    it("should remove a service", () => {
      faker
        .mock("https://foo.com")
        .get("/foo")
        .reply(200, { foo: u.string() });
      expectNServices(1);

      faker.purge();
      expectNServices(0);
    });
  });

  describe("Adding services with add()", () => {
    const petstoreService = Service.fromOpenAPI({
      schema: PetStoreSchema,
      name: "petstore",
    });
    beforeEach(() => {
      faker.purge();
      faker.add(petstoreService);
      petstoreService.state(transform.withCodes(200));
    });
    it("adds a service", () => {
      expect(countServices(faker)).toBe(1);
    });
    it("mocks after a service is added", () => {
      const res = faker.generate({
        host: "petstore.swagger.io",
        protocol: "http",
        method: "get",
        path: "/v1/pets",
        pathname: "/v1/pets",
        headers: {},
        query: {},
      });
      expect(res).toHaveProperty("body");
      expect(res.statusCode).toBe(200);
    });
  });

  describe("adding service with nock syntax", () => {
    it("adds a service", () => {
      faker
        .mock("https://foo.com")
        .get("/foo")
        .reply(200, { foo: u.string() });
      expectNServices(1);
    });
    it("adds a service and allows faking it", () => {
      faker
        .mock("https://foo.com")
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
