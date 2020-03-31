import { UnmockPackage } from "unmock-core";
import BrowserBackend from "./backend";

/**
 * Polyfill Buffer if undefined, required by URL operations
 * https://github.com/unmock/unmock-js/pull/359
 */
if (typeof Buffer === "undefined") {
  global.Buffer = require("buffer").Buffer; // tslint:disable-line:no-var-requires
}

export const unmock = new UnmockPackage(new BrowserBackend());

export const nock = unmock.mock.bind(unmock);
export const mock = unmock.mock.bind(unmock);
export default unmock;
