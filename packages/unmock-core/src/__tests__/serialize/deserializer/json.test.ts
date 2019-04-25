import JSONDeserializer from "../../../serialize/deserializer/json";

test("json serializer", () => {
  expect(new JSONDeserializer().deserialize({
    body: {foo: 1},
    headers: {
      ["content-type"]: "application/json",
    },
  })).toEqual({
    body: "{\"foo\":1}",
    headers: {
      ["content-type"]: "application/json",
    },
  });
});
