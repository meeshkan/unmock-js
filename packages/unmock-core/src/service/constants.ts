import { HTTPMethod } from "./interfaces";

export const DEFAULT_ENDPOINT = "**";
export const DEFAULT_REST_METHOD: HTTPMethod = "all";
export const OAS_PATH_PARAM_REGEXP = new RegExp("{[^}]+}");
export const OAS_PARAMS_KW = "parameters";
