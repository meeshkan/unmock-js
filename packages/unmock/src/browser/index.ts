/**
 * Polyfill Buffer if undefined, required by URL operations
 */
if (typeof Buffer === "undefined") {
  global.Buffer = require("buffer").Buffer; // tslint:disable-line:no-var-requires
}
export * from "unmock-core";
import unmock from "unmock-browser";
export * from "unmock-browser";
export default unmock;
