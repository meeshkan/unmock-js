import CompositeDeserializer from "../../../serialize/deserializer/composite";
import FormDeserializer from "../../../serialize/deserializer/form";
import JSONDeserializer from "../../../serialize/deserializer/json";

test("composite deserializer 1", () => {
  expect(
    new CompositeDeserializer(
      new JSONDeserializer(),
      new FormDeserializer(),
    ).deserialize({
      body: { foo: "1", bar: "2" },
      headers: {
        ["content-type"]: "application/x-www-form-urlencoded",
      },
    }),
  ).toEqual({
    body: "foo=1&bar=2",
    headers: {
      ["content-type"]: "application/x-www-form-urlencoded",
    },
  });
});

test("composite deserializer 2", () => {
  expect(
    new CompositeDeserializer(
      new JSONDeserializer(),
      new FormDeserializer(),
    ).deserialize({
      body: { foo: 1 },
      headers: {
        ["content-type"]: "application/json",
      },
    }),
  ).toEqual({
    body: '{"foo":1}',
    headers: {
      ["content-type"]: "application/json",
    },
  });
});
