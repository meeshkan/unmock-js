import { UnmockPackage } from "unmock-core";
import RnBackend from "./backend";

/**
 * Polyfill Buffer if undefined, required by URL operations
 * https://github.com/unmock/unmock-js/pull/359
 */
if (typeof Buffer === "undefined") {
  global.Buffer = require("buffer").Buffer; // tslint:disable-line:no-var-requires
}

export const unmock = new UnmockPackage(new RnBackend());

export const nock = unmock.nock.bind(unmock);
export const runner = unmock.runner.bind(unmock);

export default unmock;
