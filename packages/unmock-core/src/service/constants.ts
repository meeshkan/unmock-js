import XRegExp from "xregexp";

export const DEFAULT_ENDPOINT = "**";
export const OAS_PATH_PARAM_REGEXP = XRegExp("{([^}]+)}");
export const OAS_PATH_PARAMS_KW = "path";
export const UNMOCK_PATH_REGEX_KW = "x-unmock-path-regex";
