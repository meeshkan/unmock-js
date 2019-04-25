import querystring from "querystring";
import { ISerializer } from "./serializer";

export default class FormSerializer implements ISerializer {
  public serialize(json: any) {
    const contentType = json.headers ? json.headers["Content-Type"] || json.headers["content-type"] : undefined;
    if (contentType && typeof contentType === "string" && contentType.startsWith("application/x-www-form-urlencoded")) {
      return {
        ...json,
        ...(json.body && typeof json.body === "string" ? { body: json.body
          .split("&")
          .map((kv: string) => kv.split("="))
          .map(([k, v]: [string, string]) => ({
            [querystring.unescape(k)]: querystring.unescape(v),
          }))
          .reduce((a: {[key: string]: string}, b: {[key: string]: string}) => ({ ...a, ...b }), {}),
        } : {}),
      };
    }
    return json;
  }
}
