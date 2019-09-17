# openapi-refinements

Refine OpenAPI schemas to valid sub-OpenAPI scheams.

## Example of a refinement

Imagine that you had the following bit of JSON schema.

```yaml
type: string
enum: [foo, bar, baz]
```

A valid refinement would be the following.

```yaml
type: string
enum: [foo, baz]
```

In general a refinement is any Schema that produces a subset of the behavior of another Schema.  In this case, because we are dealing with OpenAPI, an API behaving according to the refined OpenAPI schema will only produce outcomes that would have been possible with the original OpenAPI schema, but not vice-versa.

## API

### `includeCodes` and `removeCodes`

```ts
includeCodes(
  info: [string | RegExp, Meth] | string | RegExp,
  r: (keyof Responses)[]
) => (o: OpenAPIObject): OpenAPIObject
```

Produce an OpenAPI schema to OpenAPI schema mapping that includes codes in `r` (ie 200, 404, default) for a path (`string` or `RegExp`) and possibly an operation (`Meth`).

To produce an OpenAPI schema to OpenAPI schema mapping that only includes the default response for every possible path, use the following.

```ts
const mapping = includeCodes(new RegExp("[a-zA-Z0-9/{}]*"), ["default"]);
```

To produice an OpenAPI schema to OpenAPI schema mapping that removes `"200"` and `"default"` from the `get` method of the path `/foo`, use the following.

```ts
const mapping = removeCodes(["/foo", "get"], ["200", "default"]);
```

## Changing paramaters, request bodies and response bodies

All changes to parameters, request bodies and response bodies represent first the change in a schema (here, "schema" means the `Schema` object in an OpenAPI Schema, which is effectively JSON schema) followed by instructions on how to reach the Schema.

For example, the signature for `changeMaxItems` is the following.

```ts
const changeMaxItems = (i: number) =>
  (
    traversal: (o: OpenAPIObject) => Traversal<OpenAPIObject, Schema | Reference>,
    path: (string | typeof Arr)[]
  ) => (o: OpenAPIObject) => OpenAPIObject
```

`i` represents the change to `maxNumbers`. `traversal` represents the path we take to get the the `Schema` we want to change, and `path` represents the path we take once we are in the `Schema`. Then, like `includeCodes` above, an OpenAPI Schema to OpenAPI Schema mapping is returned.

Another example is `changeToConst`.

```ts
const changeToConst = (val: JSONValue) =>
  (
    traversal: (o: OpenAPIObject) => Traversal<OpenAPIObject, Schema | Reference>,
    path: (string | typeof Arr)[]
  ) => (o: OpenAPIObject) => OpenAPIObject
```

The signature is almost exactly the same as above save the first element `val`, which is the constant value we are changing. For all of the following functions, the first part of the signature will be different whereas the last three parts will be the same. As a result, this section will be broken into two parts. First, we will explain the `traversal` and `path`, and then, we will explain the various actions like `changeMinItems` or `changeEnum`.

### `traversal` and `path`

`traversal` represents a `monocle-ts` traversal down to an object in an OpenAPI structure. You do not have to define your own traversals - rather, there are pre-defined traversal creators that will do this for you.

- `pathParameter` is a traversal to a parameter in a path
- `methodParameter` is a traversal to a parameter in a method
- `requestBody` is a traversal to a parameter in a request body
- `responseBody` is a traversal to a parameter in a response body

The tests show various examples of all of these traversals.

`path` represents a path *within* the object. For example, if the object is:

```yaml
type: object
properties:
  foo:
    type: object
    additionalProperties:
        type: array
        items:
        type: array
            items: [{type: string}, {type: integer}]
```

Then the path to access the second element of all the arrays of any additional property of `foo` would be `["foo", Addl, Arr, 1]`, where `Arr` is a special symbol meaning all elements in an array and `Addl` is a special symbol meaning any additional property.

### Methods

The following methods are defined for schema changes.

- `changeMinItem`
- `changeMaxItem`
- `changeToConst`
- `changeEnum`
- `changeListToTuple`
- `anyOfKeep`
- `anyOfReject`
- `oneOfKeep`
- `oneOfReject`
