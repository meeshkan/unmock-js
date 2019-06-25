import XRegExp from "xregexp";
import { HTTPMethod } from "./interfaces";

export const DEFAULT_ENDPOINT = "**";
export const DEFAULT_REST_METHOD: HTTPMethod = "all";
export const OAS_PATH_PARAM_REGEXP = XRegExp("{([^}]+)}");
export const OAS_PARAMS_KW = "parameters";
export const UNMOCK_PATH_REGEX_KW = "x-unmock-path-regex";
