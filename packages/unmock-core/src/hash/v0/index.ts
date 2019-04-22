import objectHash from "object-hash";

const removeKey = (obj: any, key: string) => {
  const { [key]: ignore, ...rest } = obj;
  return rest;
};

export const makeHashable = (initialInput: any, bigIgnore: any): any => {
  let out = initialInput;
  if (!(bigIgnore instanceof Array)) {
    bigIgnore = [bigIgnore];
  }
  for (const ignore of bigIgnore) {
    if (typeof ignore === "object" && typeof out === "object") {
      // if ignore[x] and out[x] both point to a string, filter based on value
      out = Object.keys(ignore)
        .filter((x) => Object.keys(out).indexOf(x) !== -1)
        // tslint:disable-next-line:max-line-length
        .filter((x) => typeof(ignore[x]) === "string" && ["string", "boolean", "number"].indexOf(typeof(out[x])) !== -1)
        .filter((x) => new RegExp(ignore[x]).test(`${out[x]}`))
        .reduce((acc, cur) => removeKey(acc, cur), out);
      // iterate downwards through objects, calling this function recursively
      out = {
        ...out,
        ...(Object.keys(ignore)
          .filter((x) => Object.keys(out).indexOf(x) !== -1)
          // tslint:disable-next-line:max-line-length
          .filter((x) => ["object", "string"].indexOf(typeof(ignore[x])) !== -1 && typeof(out[x]) === "object" && !(out[x] instanceof Array))
          .map((x) => ({ [x]: makeHashable(out[x], ignore[x]) }))
          .reduce((a, b) => ({ ...a, ...b }), {})),
      };
    }
    // if ignore is a string and out is an object, filter based on key
    if (typeof ignore === "string" && typeof out === "object") {
      out = Object.keys(out)
        .filter((x) => new RegExp(ignore.trim()).test(x))
        .reduce((acc, cur) => removeKey(acc, cur), out);
    }
  }
  return out;
};

const TRUNCATE_HASH_AT = 8;

export default (initialInput: any, ignore?: string) =>
  objectHash(ignore ? makeHashable(initialInput, JSON.parse(ignore)) : initialInput).substring(0, TRUNCATE_HASH_AT);
