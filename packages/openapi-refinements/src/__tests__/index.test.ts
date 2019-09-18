import {
removeCodes,
includeCodes,
mapDefaultToCodes,
changeMinItems,
Arr,
changeMaxItems,
changeRequiredStatus,
changeToConst,
changeListToTuple,
oneOfKeep,
oneOfReject,
responseBody,
methodParameter,
changeEnum,
} from "../";
import petstore from "./petstore";

test("removeCodes removes 200 and 201 everywhere", () => {
const refined = removeCodes("/pets", true, ["200", "201"])(petstore);
const refinedResponsesGet =
    (refined.paths["/pets"] &&
    refined.paths["/pets"].get &&
    refined.paths["/pets"].get.responses) ||
    {};
const refinedResponsesPost =
    (refined.paths["/pets"] &&
    refined.paths["/pets"].post &&
    refined.paths["/pets"].post.responses) ||
    {};
const responsesGet =
    (petstore.paths["/pets"] &&
    petstore.paths["/pets"].get &&
    petstore.paths["/pets"].get.responses) ||
    {};
const responsesPost =
    (petstore.paths["/pets"] &&
    petstore.paths["/pets"].post &&
    petstore.paths["/pets"].post.responses) ||
    {};
expect(Object.keys(refinedResponsesGet)).toEqual(["default"]);
expect(refinedResponsesGet.default).toEqual(responsesGet.default);
expect(Object.keys(refinedResponsesPost)).toEqual(["default"]);
expect(refinedResponsesPost.default).toEqual(responsesPost.default);
});

test("removeCodes removes 200", () => {
const refined = removeCodes("/pets", "get", ["200"])(petstore);
const refinedResponses =
    (refined.paths["/pets"] &&
    refined.paths["/pets"].get &&
    refined.paths["/pets"].get.responses) ||
    {};
const resposnes =
    (petstore.paths["/pets"] &&
    petstore.paths["/pets"].get &&
    petstore.paths["/pets"].get.responses) ||
    {};
expect(Object.keys(refinedResponses)).toEqual(["default"]);
expect(refinedResponses.default).toEqual(resposnes.default);
});

test("removeCodes removes all codes", () => {
const refined = removeCodes("/pets", "get", ["200", "default"])(petstore);
const refinedResponses =
    (refined.paths["/pets"] &&
    refined.paths["/pets"].get &&
    refined.paths["/pets"].get.responses) ||
    {};
expect(Object.keys(refinedResponses)).toEqual([]);
});

test("includeCodes includes 200", () => {
const refined = includeCodes("/pets", "get", ["200"])(petstore);
const responses =
    (refined.paths["/pets"] &&
    refined.paths["/pets"].get &&
    refined.paths["/pets"].get.responses) ||
    {};
const refinedResponses =
    (petstore.paths["/pets"] &&
    petstore.paths["/pets"].get &&
    petstore.paths["/pets"].get.responses) ||
    {};
expect(Object.keys(responses)).toEqual(["200"]);
expect(refinedResponses["200"]).toEqual(responses["200"]);
});

test("includeCodes works on regex", () => {
const refined = includeCodes(new RegExp("[a-zA-Z0-9/{}]*"), true, [
    "default"
])(petstore);
const petsResponses =
    (refined.paths["/pets"] &&
    refined.paths["/pets"].get &&
    refined.paths["/pets"].get.responses) ||
    {};
expect(Object.keys(petsResponses)).toEqual(["default"]);
const petsIdResponses =
    (refined.paths["/pets/{petId}"] &&
    refined.paths["/pets/{petId}"].get &&
    refined.paths["/pets/{petId}"].get.responses) ||
    {};
expect(Object.keys(petsIdResponses)).toEqual(["default"]);
});

test("includeCodes includes all codes", () => {
const refined = includeCodes("/pets", "get", ["200", "default"])(petstore);
const responses =
    (refined.paths["/pets"] &&
    refined.paths["/pets"].get &&
    refined.paths["/pets"].get.responses) ||
    {};
expect(Object.keys(responses)).toEqual(["200", "default"]);
});


test("everything is composeable", () => {
const refined = [
    includeCodes("/pets", "get", ["200"]),
    removeCodes("/pets", "post", ["201"])
].reduce((a, b) => b(a), petstore);
const refinedResponsesGet =
    (refined.paths["/pets"] &&
    refined.paths["/pets"].get &&
    refined.paths["/pets"].get.responses) ||
    {};
const refinedResponsesPost =
    (refined.paths["/pets"] &&
    refined.paths["/pets"].post &&
    refined.paths["/pets"].post.responses) ||
    {};
const responsesGet =
    (petstore.paths["/pets"] &&
    petstore.paths["/pets"].get &&
    petstore.paths["/pets"].get.responses) ||
    {};
const responsesPost =
    (petstore.paths["/pets"] &&
    petstore.paths["/pets"].post &&
    petstore.paths["/pets"].post.responses) ||
    {};
expect(Object.keys(refinedResponsesGet)).toEqual(["200"]);
expect(refinedResponsesGet["200"]).toEqual(responsesGet["200"]);
expect(Object.keys(refinedResponsesPost)).toEqual(["default"]);
expect(refinedResponsesPost.default).toEqual(responsesPost.default);
});

test("map default to codes correctly maps default to 200", () => {
  const refined = [
      mapDefaultToCodes("/pets", "get", ["200"]),
      includeCodes("/pets", "get", ["200"]),
  ].reduce((a, b) => b(a), petstore);
  expect((<any>refined).paths["/pets"].get.responses["200"].content[
    "application/json"
    ].schema.$ref).toBe("#/components/schemas/Error");
});

test("changeMinItems changes min items", () => {
const refined = changeMinItems(5)(responseBody("/pets", true, ["200"]), [])(
    petstore
);
expect(
    (<any>refined).paths["/pets"].get.responses["200"].content[
    "application/json"
    ].schema.minItems
).toBe(5);
});

test("changeMaxItems changes max items on nested object", () => {
const refined = changeMaxItems(63)(responseBody("/pets", true, ["200"]), [
    Arr,
    "tags"
])(petstore);
expect(
    (<any>refined).paths["/pets"].get.responses["200"].content[
    "application/json"
    ].schema.items.properties.tags.maxItems
).toBe(63);
expect(
    (<any>refined).paths["/pets"].get.responses["200"].content[
    "application/json"
    ].schema.maxItems
).toBe(undefined);
});

test("changing an enum is possible", () => {
const refined = changeEnum(["cute"], true)(
    responseBody("/pets", true, ["200"]),
    [Arr, "tags", Arr]
)(petstore);
expect(
    (<any>refined).paths["/pets"].get.responses["200"].content[
    "application/json"
    ].schema.items.properties.tags.items.enum
).toEqual(["cute"]);
});

test("changeRequiredStatus changes required status on nested object", () => {
const refined = changeRequiredStatus("tags")(
    responseBody("/pets", true, ["200"]),
    [Arr]
)(petstore);
expect(
    new Set(
    (<any>refined).paths["/pets"].get.responses["200"].content[
        "application/json"
    ].schema.items.required
    )
).toEqual(new Set(["id", "name", "tags"]));
});

test("changeToConst accepts const with empty array", () => {
const refined = changeToConst([])(responseBody("/pets", true, ["200"]), [])(
    petstore
);
expect(
    (<any>refined).paths["/pets"].get.responses["200"].content[
    "application/json"
    ].schema.items
).toEqual([]);
});

test("changeToConst accepts const with full array", () => {
const refined = changeToConst([
    { id: 0, name: "Fluffy" },
    { id: 1, name: "Trix", tags: ["cute", "sad"] }
])(responseBody("/pets", true, ["200"]), [])(petstore);
expect(
    (<any>refined).paths["/pets"].get.responses["200"].content[
    "application/json"
    ].schema.items[0].properties.id.enum[0]
).toBe(0);
expect(
    (<any>refined).paths["/pets"].get.responses["200"].content[
    "application/json"
    ].schema.items[1].properties.id.enum[0]
).toBe(1);
expect(
    (<any>refined).paths["/pets"].get.responses["200"].content[
    "application/json"
    ].schema.items[1].properties.name.enum[0]
).toBe("Trix");
expect(
    (<any>refined).paths["/pets"].get.responses["200"].content[
    "application/json"
    ].schema.items[1].properties.tags.items[0].enum[0]
).toBe("cute");
expect(
    (<any>refined).paths["/pets"].get.responses["200"].content[
    "application/json"
    ].schema.items[1].required
).toEqual(["id", "name", "tags"]);
});

test("changeListToTuple length is correct", () => {
const refined = [
    changeListToTuple(5)(responseBody("/pets", true, ["200"]), []),
    changeToConst(42)(responseBody("/pets", true), [2, "id"])
].reduce((a, b) => b(a), petstore);
expect(
    (<any>refined).paths["/pets"].get.responses["200"].content[
    "application/json"
    ].schema.items.length
).toEqual(5);
expect(
    (<any>refined).paths["/pets"].get.responses["200"].content[
    "application/json"
    ].schema.items[2].properties.id.enum[0]
).toEqual(42);
});

test("whittling oneOf with keep is correct", () => {
const refined = oneOfKeep([0, 3, 4])(
    responseBody("/pets/{petId}", true, ["default"]),
    []
)(petstore);
expect(
    (<any>refined).paths["/pets/{petId}"].get.responses["default"].content[
    "application/json"
    ].schema.oneOf.length
).toEqual(3);
expect(
    (<any>refined).paths["/pets/{petId}"].get.responses["default"].content[
    "application/json"
    ].schema.oneOf[2].$ref
).toEqual("#/components/schemas/Error5");
});

test("whittling oneOf with reject is correct", () => {
const refined = oneOfReject([0, 3, 4])(
    responseBody("/pets/{petId}", true, ["default"]),
    []
)(petstore);
expect(
    (<any>refined).paths["/pets/{petId}"].get.responses["default"].content[
    "application/json"
    ].schema.oneOf.length
).toEqual(2);
expect(
    (<any>refined).paths["/pets/{petId}"].get.responses["default"].content[
    "application/json"
    ].schema.oneOf[1].$ref
).toEqual("#/components/schemas/Error3");
});

test("changing a parameter is possible", () => {
const refined = changeToConst(42)(
    methodParameter("/pets", true, "limit", "query"),
    []
)(petstore);
expect((<any>refined).paths["/pets"].get.parameters[0].schema.enum[0]).toBe(
    42
);
});
