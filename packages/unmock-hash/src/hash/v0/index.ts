import objectHash from "object-hash";
import querystring from "querystring";
import { IJSONValue } from "../../jsonType";

export interface IHashableV0 {
  [key: string]: string | undefined | string[] | {};
  body: string | {};
  headers: { [key: string]: string };
  hostname: string;
  method: string;
  path: string;
  story: string[];
  user_id: string;
  signature?: string;
}

export interface IHashableWithIgnoreV0 {
  body?: string | {};
  headers?: { [key: string]: string };
  hostname?: string;
  method?: string;
  path?: string;
  story?: string[];
  user_id?: string;
  signature?: string;
}

export interface ISerializedHashableWithIgnoreV0 {
  body?: string | {} | IJSONValue | { [key: string]: string };
  headers?: { [key: string]: string };
  hostname?: string;
  method?: string;
  path?: string;
  story?: string[];
  user_id?: string;
  signature?: string;
}

export interface IIgnoreObjectV0 {
  [key: string]: string | undefined | string[] | {};
  body?: string;
  headers?: string | string[] | { [key: string]: string };
  hostname?: string;
  method?: string;
  path?: string;
  story?: string | string[];
  user_id?: string;
  signature?: string;
}

export type IgnoreFieldV0 =
  | "body"
  | "headers"
  | "hostname"
  | "method"
  | "path"
  | "story"
  | "user_id"
  | "signature";
export type SingleIgnoreV0 = IIgnoreObjectV0 | IgnoreFieldV0;
export type IgnoreV0 = SingleIgnoreV0 | SingleIgnoreV0[];

const shouldIgnoreByRemoving = (
  ignore: IIgnoreObjectV0,
  out: IHashableV0,
  attributeName: string,
): boolean => {
  const ignoreAttr = ignore[attributeName];
  if (ignoreAttr === undefined || typeof ignoreAttr !== "string") {
    return false;
  }
  const outAttr = out[attributeName];
  if (typeof outAttr !== "string") {
    return false;
  }
  return new RegExp(ignoreAttr).test(outAttr);
};

const ignoreByRemoving = (
  ignore: IIgnoreObjectV0,
  out: IHashableV0,
  attributeName: string,
) => {
  if (shouldIgnoreByRemoving(ignore, out, attributeName)) {
    delete out[attributeName];
  }
};

export const makeIgnorable = (
  initialInput: IHashableV0,
  bigIgnore: IgnoreV0,
): IHashableWithIgnoreV0 => {
  const out = {
    ...initialInput,
    headers: { ...initialInput.headers },
    story: [...initialInput.story],
  };
  if (!(bigIgnore instanceof Array)) {
    bigIgnore = [bigIgnore];
  }
  for (const ignore of bigIgnore) {
    if (typeof ignore === "string") {
      delete out[ignore];
      continue;
    }
    ignoreByRemoving(ignore, out, "body");
    ignoreByRemoving(ignore, out, "hostname");
    ignoreByRemoving(ignore, out, "method");
    ignoreByRemoving(ignore, out, "path");
    ignoreByRemoving(ignore, out, "user_id");
    ignoreByRemoving(ignore, out, "signature");
    if (ignore.story) {
      out.story = out.story.filter(
        (story) =>
          !(
            typeof ignore.story === "string" &&
            new RegExp(ignore.story).test(story)
          ) &&
          !(
            ignore.story instanceof Array &&
            ignore.story.filter((sub) => new RegExp(sub).test(story)).length > 0
          ),
      );
    }
    if (ignore.headers) {
      out.headers = Object.keys(out.headers)
        .filter(
          (header) =>
            !(
              typeof ignore.headers === "string" &&
              new RegExp(ignore.headers).test(header)
            ) &&
            !(
              ignore.headers instanceof Array &&
              ignore.headers.filter((sub) => new RegExp(sub).test(header))
                .length > 0
            ) &&
            !(
              typeof ignore.headers === "object" &&
              !(ignore.headers instanceof Array) &&
              Object.entries(ignore.headers).filter(
                ([k, v]) => k === header && new RegExp(v).test(header),
              ).length > 0
            ),
        )
        .map((k) => ({ [k]: out.headers[k] }))
        .reduce((a, b) => ({ ...a, ...b }), {});
    }
  }
  return out;
};

export const applyActions = (
  initialInput: IHashableWithIgnoreV0,
  actions: ActionsV0,
): ISerializedHashableWithIgnoreV0 => {
  const out: ISerializedHashableWithIgnoreV0 = {
    ...initialInput,
    ...(initialInput.headers ? { headers: { ...initialInput.headers } } : {}),
    ...(initialInput.story ? { story: [...initialInput.story] } : {}),
  };
  actions = typeof actions === "string" ? [actions] : actions;
  for (const action of actions) {
    if (action === "make-header-keys-lowercase" && out.headers) {
      out.headers = Object.entries(out.headers)
        .map(([k, v]) => ({ [k.toLowerCase()]: v }))
        .reduce((a, b) => ({ ...a, ...b }), {});
    }
    if (
      action === "deserialize-x-www-form-urlencoded-body" &&
      typeof out.body === "string"
    ) {
      out.body = querystring
        .parse(out.body)
        .reduce((a, b) => ({ ...a, ...b }), {});
    }
    if (action === "deserialize-json-body" && typeof out.body === "string") {
      out.body = JSON.parse(out.body);
    }
  }
  return out;
};

export type ActionsActionsV0 =
  | "make-header-keys-lowercase"
  | "deserialize-json-body"
  | "deserialize-x-www-form-urlencoded-body";
export type ActionsV0 = ActionsActionsV0 | ActionsActionsV0[];

export const TRUNCATE_HASH_AT = 8;

export default (
  initialInput: IHashableV0,
  ignore?: IgnoreV0,
  action?: ActionsV0,
) =>
  objectHash(
    applyActions(makeIgnorable(initialInput, ignore || []), action || []),
  ).substring(0, TRUNCATE_HASH_AT);
