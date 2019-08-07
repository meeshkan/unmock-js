const unmockRequire = require("../");  // tslint:disable-line:no-var-requires
const dslRequire = require("../").dsl;  // tslint:disable-line:no-var-requires
import unmockDefaultImport from "../";
import { dsl } from "../";

describe("Imports", () => {
    describe("with require", () => {
        it("should have expected properties for unmock", () => {
            expect(unmockRequire).toBeDefined();
            expect(unmockRequire).toHaveProperty("on");
        });
        it("should have expected properties for dsl object", () => {
            expect(dslRequire).toBeDefined();
        });
    });
    describe("with ES6 import", () => {
        it("should have expected properties for unmock", () => {
            expect(unmockDefaultImport).toBeDefined();
            expect(unmockDefaultImport).toHaveProperty("on");
        });
        it("should have expected properties for dsl object", () => {
            expect(dsl).toBeDefined();
            expect(dsl).toHaveProperty("textResponse");
        });
    });
});
