import { UnmockPackage } from "unmock-core";
import RnBackend from "./backend";

export const unmock = new UnmockPackage(new RnBackend());

export const nock = unmock.nock.bind(unmock);
export const runner = unmock.runner.bind(unmock);

export default unmock;
