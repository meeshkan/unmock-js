import JSONSerializer from "../../../serialize/serializer/json";

test("json serializer", () => {
  expect(
    new JSONSerializer().serialize({
      body: '{"foo":1}',
      headers: {
        ["content-type"]: "application/json"
      }
    })
  ).toEqual({
    body: { foo: 1 },
    headers: {
      ["content-type"]: "application/json"
    }
  });
});
