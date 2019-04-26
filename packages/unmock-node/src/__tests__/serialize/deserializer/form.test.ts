import FormDeserializer from "../../../serialize/deserializer/form";

test("form deserializer", () => {
  expect(
    new FormDeserializer().deserialize({
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
