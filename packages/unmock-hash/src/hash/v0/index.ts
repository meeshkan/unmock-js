import objectHash from "object-hash";
import querystring from "querystring";
import { IJSONValue } from "../../jsonType";

interface IStringMap {
  [key: string]: string;
}

export interface IHashableV0 {
  // Used as input/filtered input (after `ignore`ing as needed)
  [key: string]: string | undefined | string[] | IStringMap | {};
  body: string | {};
  headers: IStringMap;
  hostname: string;
  method: string;
  path: string;
  story: string[];
  user_id: string;
  signature?: string;
}

interface ISerializedHashableWithIgnoreV0 {
  // Identical to above, represents content after certain actions has taken place
  body?: string | {} | IJSONValue | IStringMap;
  headers?: IStringMap;
  hostname?: string;
  method?: string;
  path?: string;
  story?: string[];
  user_id?: string;
  signature?: string;
}

export interface IIgnoreObjectV0 {
  // Describes how and which fields from IHashableV0 to ignore.
  [key: string]: string | undefined | string[] | IStringMap;
  body?: string;
  headers?: string | string[] | IStringMap;
  hostname?: string;
  method?: string;
  path?: string;
  story?: string | string[];
  user_id?: string;
  signature?: string;
}

type IgnoreFieldV0 =
  | "body"
  | "headers"
  | "hostname"
  | "method"
  | "path"
  | "story"
  | "user_id"
  | "signature";
type SingleIgnoreV0 = IIgnoreObjectV0 | IgnoreFieldV0;
type IgnoreV0 = SingleIgnoreV0 | SingleIgnoreV0[];

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

const makeArray = (input: any) => (input instanceof Array ? input : [input]);

export const makeIgnorable = (
  initialInput: IHashableV0,
  bigIgnore: IgnoreV0,
): Partial<IHashableV0> => {
  const out = {
    ...initialInput,
    headers: {
      ...(initialInput.headers !== undefined ? initialInput.headers : {}),
    },
    story: [...(initialInput.story !== undefined ? initialInput.story : [])],
  };
  bigIgnore = makeArray(bigIgnore);
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

const applyActions = (
  initialInput: Partial<IHashableV0>,
  actions: ActionsV0 | ActionsV0[],
): ISerializedHashableWithIgnoreV0 => {
  const out: ISerializedHashableWithIgnoreV0 = {
    ...initialInput,
    ...(initialInput.headers ? { headers: { ...initialInput.headers } } : {}),
    ...(initialInput.story ? { story: [...initialInput.story] } : {}),
  };
  actions = makeArray(actions);
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
      out.body = querystring.parse(out.body);
    }
    if (action === "deserialize-json-body" && typeof out.body === "string") {
      out.body = JSON.parse(out.body);
    }
  }
  return out;
};

export type ActionsV0 =
  | "make-header-keys-lowercase"
  | "deserialize-json-body"
  | "deserialize-x-www-form-urlencoded-body";

const TRUNCATE_HASH_AT = 8;

export default (
  initialInput: IHashableV0,
  ignore?: IgnoreV0,
  action?: ActionsV0 | ActionsV0[],
  challenge?: string,
  onError?: (
    initialInput: IHashableV0,
    afterIgnore: Partial<IHashableV0>,
    afterActions: ISerializedHashableWithIgnoreV0) => void,
) => {
  const afterIgnored = makeIgnorable(initialInput, ignore || []);
  const afterActions = applyActions(afterIgnored, action || []);
  const hash = objectHash(afterActions).substring(0, TRUNCATE_HASH_AT);
  if (challenge && hash !== challenge && onError) {
    onError(initialInput, afterIgnored, afterActions);
  }
  return hash;
};
