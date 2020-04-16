// https://github.com/meeshkan/unmock-js/issues/406

import Axios from "axios";
import unmock, { Service, transform } from "unmock";
const { withCodes } = transform;

let exampleService1: Service;
let exampleService2: Service;

unmock
  .nock("https://www.example.com", "ExampleService1")
  .get("/exampleEndpoint1")
  .reply(200, { Hello: "World" })
  .get("/example")
  .reply(401, "Unauthorized");

unmock
  .nock("https://www.example.cloud.com", "ExampleService2")
  .get("/exampleEndpoint2")
  .reply(200, { Bella: "Ciao" })
  .get("/example2")
  .reply(401, "Unauthorized");

beforeAll(() => {
  const { ExampleService1, ExampleService2 } = unmock.on().services;
  exampleService1 = ExampleService1;
  exampleService2 = ExampleService2;
});
beforeEach(() => {
  exampleService1.reset();
  exampleService2.reset();
});
afterEach(() => {
  exampleService1.spy.resetHistory();
  exampleService2.spy.resetHistory();
});
afterAll(() => {
  unmock.off();
});

it("should set state transformations for the correct services", async () => {
  exampleService1.state(withCodes(200));
  exampleService2.state(withCodes(401));
  const { data } = await Axios.get("https://www.example.com/exampleEndpoint1");
  expect(data).toEqual({ Hello: "World" });
});
