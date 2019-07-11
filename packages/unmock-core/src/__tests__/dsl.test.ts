import { DSL } from "../service/dsl";
import { codeToMedia } from "../service/interfaces";

// tslint:disable: object-literal-key-quotes

const responsesWithoutProperties: codeToMedia = {
  200: {
    "application/json": {},
  },
};

const responsesWithProperties: codeToMedia = {
  200: {
    "application/json": {
      properties: {
        foo: {
          type: "integer",
        },
      },
    },
  },
};

describe("Resolves top level DSL to OAS", () => {
  it("Returns undefined with undefined input", () => {
    expect(DSL.translateTopLevelToOAS({}, undefined)).toBeUndefined();
  });

  describe("Handles $times correctly", () => {
    it("Does nothing with invalid $times (0, negative, wrong type) without STRICT_MODE", () => {
      DSL.STRICT_MODE = false;
      let translated = DSL.translateTopLevelToOAS(
        { $times: 0.3 },
        responsesWithoutProperties,
      );
      expect(translated).toEqual({ 200: { "application/json": {} } });

      translated = DSL.translateTopLevelToOAS(
        { $times: -2 },
        responsesWithoutProperties,
      );
      expect(translated).toEqual({ 200: { "application/json": {} } });

      translated = DSL.translateTopLevelToOAS(
        { $times: undefined },
        responsesWithoutProperties,
      );
      expect(translated).toEqual({ 200: { "application/json": {} } });
    });

    it("Throws on invalid $times (0) with STRICT_MODE", () => {
      DSL.STRICT_MODE = true;
      const translated = () =>
        DSL.translateTopLevelToOAS({ $times: 0.3 }, responsesWithoutProperties);
      expect(translated).toThrow("Can't set response $times to 0.3"); // 0.3 gets rounded to 0 and throws
    });

    it("Throws on invalid $times (negative) with STRICT_MODE", () => {
      DSL.STRICT_MODE = true;
      const translated = () =>
        DSL.translateTopLevelToOAS({ $times: -1 }, responsesWithoutProperties);
      expect(translated).toThrow("Can't set response $times to -1");
    });

    it("Throws on invalid $times (wrong type) with STRICT_MODE", () => {
      DSL.STRICT_MODE = true;
      const translated = () =>
        DSL.translateTopLevelToOAS({ $times: "a" }, responsesWithoutProperties);
      expect(translated).toThrow(
        "Can't set response $times with non-numeric value!",
      );
    });

    it("Adds properties when missing", () => {
      const translated = DSL.translateTopLevelToOAS(
        { $times: 1 },
        responsesWithoutProperties,
      );
      expect(translated).toEqual({
        200: {
          "application/json": {
            properties: { "x-unmock-times": { type: "unmock", default: 1 } },
          },
        },
      });
    });

    it("Adds to properties when it exists", () => {
      const translated = DSL.translateTopLevelToOAS(
        { $times: 2 },
        responsesWithProperties,
      );
      expect(translated).toEqual({
        200: {
          "application/json": {
            properties: {
              foo: { type: "integer" },
              "x-unmock-times": { type: "unmock", default: 2 },
            },
          },
        },
      });
    });
  });
});

describe("Acts on top level DSL in OAS", () => {
  describe("Acts on $times correctly", () => {
    let states: codeToMedia;
    beforeEach(
      () =>
        (states = {
          200: {
            "application/json": {
              properties: {
                "x-unmock-times": { type: "unmock", default: 2 },
              },
            },
          },
        }),
    );

    it("Removes $times in returned copy", () => {
      const copy = DSL.actTopLevelFromOAS(states);
      // removes properties as nothing's there anymore
      expect(copy).toEqual({});
    });

    it("Decreases $times in original states", () => {
      DSL.actTopLevelFromOAS(states);
      expect(states["200"]["application/json"].properties).toEqual({
        "x-unmock-times": { type: "unmock", default: 1 },
      });
    });

    it("Removes $times from original states", () => {
      DSL.actTopLevelFromOAS(states);
      DSL.actTopLevelFromOAS(states);
      DSL.actTopLevelFromOAS(states);
      expect(states["200"]["application/json"]).toBeUndefined(); // media type is removed if its now empty
    });
  });
});
