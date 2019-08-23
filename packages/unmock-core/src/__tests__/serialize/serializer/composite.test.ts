import CompositeSerializer from "../../../serialize/serializer/composite";
import FormSerializer from "../../../serialize/serializer/form";
import JSONSerializer from "../../../serialize/serializer/json";

test("composite serializer 1", () => {
  expect(
    new CompositeSerializer(
      new JSONSerializer(),
      new FormSerializer(),
    ).serialize({
      body: "foo=1&bar=2",
      headers: {
        ["content-type"]: "application/x-www-form-urlencoded",
      },
    }),
  ).toEqual({
    body: { foo: "1", bar: "2" },
    headers: {
      ["content-type"]: "application/x-www-form-urlencoded",
    },
  });
});

test("composite serializer 2", () => {
  expect(
    new CompositeSerializer(
      new JSONSerializer(),
      new FormSerializer(),
    ).serialize({
      body: '{"foo":1}',
      headers: {
        ["content-type"]: "application/json",
      },
    }),
  ).toEqual({
    body: { foo: 1 },
    headers: {
      ["content-type"]: "application/json",
    },
  });
});
