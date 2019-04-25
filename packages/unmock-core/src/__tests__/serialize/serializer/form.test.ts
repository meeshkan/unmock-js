import FormSerializer from "../../../serialize/serializer/form";

test("form serializer", () => {
  expect(new FormSerializer().serialize({
    body: "foo=1&bar=2",
    headers: {
      ["content-type"]: "application/x-www-form-urlencoded",
    },
  })).toEqual({
    body: {foo: "1", bar: "2"},
    headers: {
      ["content-type"]: "application/x-www-form-urlencoded",
    },
  });
});
